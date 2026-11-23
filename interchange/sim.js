// Interchange trails sim: the Intelligent Driver Model on a road network.
// Cars follow fixed paths through links; they never change lanes.
// At a merge the ramp yields to the lane, as a driver waits for a gap.

import { linkPose } from './designs.js';

export const MAX_CARS = 1200;
const P = { T: 1.1, s0: 2.2, a: 1.4, b: 2.2 };
const SUB = 1 / 60;
// How far a driver looks ahead for a leader, a merge or a slower road.
const LOOK = 160;
// A ramp driver who waits this long pushes in.
const PATIENCE = 6;
// Brake lights come on under this deceleration, and when a car stands.
const LAMP_DECEL = -1.0, LAMP_STAND = 0.6;
const STOP_DECEL = 7, HOLD_AFTER = 0.8;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// A small seeded random, so every run starts the same.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Shares of each approach's traffic: through, right, left.
const SHARE = { through: 0.6, right: 0.2, left: 0.2 };

export function makeSim(net, flow = 0.5) {
  const rand = rng(373);
  const { links, paths } = net;
  let cars = [];
  let t = 0, nextId = 0;
  // Vehicles per second on each approach, from the flow slider.
  let perRoad = 0;
  const events = [];
  // Lane entrances: the first link of each lane and the paths that start there.
  const gates = [];
  for (let d = 0; d < 4; d++) for (let i = 0; i < 2; i++) {
    const ps = paths.filter(p => p.road === d && p.lane === i);
    const first = links[ps[0].links[0]];
    // The inner lane carries through traffic only; the outer lane takes the turns.
    const opts = ps.map(p => ({ p, w: p.move === 'through' ? SHARE.through * (i === 0 ? 0.5 : 0.5) : SHARE[p.move] }));
    const total = opts.reduce((k, o) => k + o.w, 0);
    gates.push({ first, opts, share: total, acc: rand() });
  }
  const shareSum = gates.reduce((k, g) => k + g.share, 0) / 4;
  setFlow(flow);

  function setFlow(f) {
    // 0 to 1 maps to 500 to 3600 vehicles an hour on each approach.
    perRoad = (500 + 3100 * clamp(f, 0, 1)) / 3600;
  }

  function makeCar(p, v) {
    const c = {
      id: nextId++, path: p, li: 0, s: 0, v, acc: 0,
      len: 4.2 + 0.7 * rand(),
      T: P.T * (0.9 + 0.2 * rand()), a: P.a * (0.9 + 0.2 * rand()), vf: 0.92 + 0.14 * rand(),
      paint: Math.floor(rand() * 997) % 9,
      lamp: 0, braking: false, stop: 0, held: false, wait: 0, yielding: false,
      fade: 0, pose: new Float32Array(5), lamps: new Float32Array(8), fresh: true,
    };
    // One in nine is a lorry: long, slow to pull away.
    if (rand() < 0.11) { c.len = 13 + 3 * rand(); c.a *= 0.55; c.vf *= 0.82; c.truck = true; }
    return c;
  }

  const linkOf = c => links[c.path.links[c.li]];

  // The car ahead on the path, or a car at a merge that has the right of way.
  // Returns the gap and the leader's speed.
  function leader(c, out) {
    const L = linkOf(c);
    let gap = 1e9, vl = 0;
    const o = L.cars[c.k + 1];
    if (o) {
      gap = o.s - c.s - (o.len + c.len) / 2; vl = o.v;
    }
    let dist = L.len - c.s;
    c.yielding = false;
    for (let j = c.li + 1; j < c.path.links.length && dist < LOOK; j++) {
      const lk = links[c.path.links[j]];
      const from = links[c.path.links[j - 1]];
      // A merge: another link also runs into this one.
      if (lk.prev.length > 1 && dist < 120) {
        for (const pid of lk.prev) {
          if (pid === from.id) continue;
          const p = links[pid];
          const o = p.cars[p.cars.length - 1];
          if (!o) continue;
          const dOther = p.len - o.s;
          if (from.major) {
            // The lane gives way only to a ramp car that has pulled in.
            if (!o.yielding && dOther < dist) {
              const g = dist - dOther - (o.len + c.len) / 2;
              if (g < gap) { gap = g; vl = o.v; }
            }
          } else if (dOther < dist) {
            const g = dist - dOther - (o.len + c.len) / 2;
            if (g < gap) { gap = g; vl = o.v; }
          } else if (c.wait < PATIENCE && dist < 90 && (dOther - o.len / 2) / Math.max(o.v, 1) - Math.max(0, dist - c.len / 2) / Math.max(c.v, 3) < 1.0 + Math.max(0, o.v - c.v) / 8) {
            // The lane car would reach the merge too soon after this one: wait for a gap.
            const g = dist - c.len / 2 - 0.5;
            if (g < gap) { gap = g; vl = 0; }
            c.yielding = true;
          }
        }
      }
      if (gap < 1e8 && gap < dist) break;
      if (lk.cars.length) {
        const o = lk.cars[0];
        const g = dist + o.s - (o.len + c.len) / 2;
        if (g < gap) { gap = g; vl = o.v; }
        break;
      }
      dist += lk.len;
    }
    out[0] = gap; out[1] = vl;
    return out;
  }

  // The speed a driver wants: its road's, eased down for a slower road ahead.
  function wantSpeed(c) {
    const L = linkOf(c);
    let v = L.v0 * c.vf;
    let dist = L.len - c.s;
    for (let j = c.li + 1; j < c.path.links.length && dist < 220; j++) {
      const lk = links[c.path.links[j]];
      v = Math.min(v, Math.sqrt((lk.v0 * c.vf) ** 2 + 2 * 1.1 * dist));
      dist += lk.len;
    }
    return v;
  }

  const lb = [0, 0];
  function sub(dt) {
    for (const l of links) {
      if (l.cars.length > 1) l.cars.sort((a, b) => a.s - b.s);
      for (let k = 0; k < l.cars.length; k++) l.cars[k].k = k;
    }
    for (const c of cars) {
      leader(c, lb);
      const s = lb[0], dv = c.v - lb[1];
      const v0 = Math.max(1, wantSpeed(c));
      const ss = P.s0 + Math.max(0, c.v * c.T + c.v * dv / (2 * Math.sqrt(c.a * P.b)));
      let a = c.a * (1 - (c.v / v0) ** 4 - (ss / Math.max(0.3, s)) ** 2);
      if (c.held || c.stop > 0) a = Math.min(a, c.v > 0.01 ? -STOP_DECEL : -c.v / dt);
      c.acc = clamp(a, -9, c.a);
    }
    for (const c of cars) {
      c.v = Math.max(0, c.v + c.acc * dt);
      c.s += c.v * dt;
      c.wait = c.yielding && c.v < 1 ? c.wait + dt : c.yielding ? c.wait : 0;
      if (c.stop > 0 && c.v < 0.05 && !c.held) c.stop -= dt / HOLD_AFTER;
      let L = linkOf(c);
      while (c.s > L.len) {
        c.s -= L.len;
        L.cars.splice(L.cars.indexOf(c), 1);
        c.li++;
        if (c.li >= c.path.links.length) { c.gone = true; break; }
        L = linkOf(c);
        L.cars.unshift(c);
        c.wait = 0;
      }
    }
    if (cars.some(c => c.gone)) cars = cars.filter(c => !c.gone);
    // New cars at each lane's start, when the lane has room.
    for (const g of gates) {
      g.acc += perRoad * g.share / shareSum * dt;
      if (g.acc < 1 || cars.length >= MAX_CARS) continue;
      const last = g.first.cars[0];
      if (last && last.s < last.len / 2 + 16) continue;
      g.acc -= 1;
      let r = rand() * g.share, o = g.opts[0];
      for (const q of g.opts) { r -= q.w; if (r <= 0) { o = q; break; } }
      const v = last ? Math.min(last.v, links[o.p.links[0]].v0) : links[o.p.links[0]].v0 * 0.95;
      const c = makeCar(o.p, v);
      g.first.cars.unshift(c);
      cars.push(c);
    }
    // A long queue at a gate holds back no more than a few cars.
    for (const g of gates) g.acc = Math.min(g.acc, 3);
    t += dt;
  }

  function lights(dt) {
    for (const c of cars) {
      const want = c.acc < LAMP_DECEL || c.v < LAMP_STAND ? 1 : 0;
      if (want && !c.braking) events.push({ id: c.id, hard: clamp(-c.acc / 6, 0, 1) });
      c.braking = !!want;
      c.lamp = want ? Math.min(1, c.lamp + dt / 0.06) : Math.max(0, c.lamp - dt / 0.2);
      c.fade = Math.min(1, c.fade + dt / 0.5);
    }
  }

  // Each lamp's place: two heads, two tails, from the car's pose.
  function pose() {
    for (const c of cars) {
      const p = linkPose(linkOf(c), c.s, c.pose);
      const hx = p[2], hy = p[3], nx = -hy, ny = hx, f = c.len / 2 - 0.25, w = 0.7;
      const L = c.lamps;
      L[0] = p[0] + hx * f + nx * w; L[1] = p[1] + hy * f + ny * w;
      L[2] = p[0] + hx * f - nx * w; L[3] = p[1] + hy * f - ny * w;
      L[4] = p[0] - hx * f + nx * w; L[5] = p[1] - hy * f + ny * w;
      L[6] = p[0] - hx * f - nx * w; L[7] = p[1] - hy * f - ny * w;
    }
  }

  return {
    get cars() { return cars; },
    get t() { return t; },
    get net() { return net; },
    // Cars at a crawl: the toy stays lively while any knot is in flight.
    get crawling() { let n = 0; for (const c of cars) if (c.v < 4) n++; return n; },
    step(dt) {
      let left = dt;
      while (left > 1e-6) { const h = Math.min(SUB, left); sub(h); lights(h); left -= h; }
      pose();
    },
    setFlow,
    brake(id, held) {
      const c = cars.find(k => k.id === id);
      if (!c) return null;
      c.stop = 1; c.held = !!held;
      return c;
    },
    release(id, held) {
      const c = cars.find(k => k.id === id);
      if (c) { c.held = false; if (!held) c.stop = Math.max(c.stop, 0.01); else c.stop = 0.01; }
    },
    takeEvents() { return events.splice(0); },
  };
}
