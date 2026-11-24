/* ---------- K7: production line ---------- */
// Stocks, workers, jobs, routes and growth. Plain JS: no DOM, no GL, no imports.
// Ant farm builds it. Steel line copies the file whole; never import it across toys.
// Plan: docs/plans/antfarm.md, "The kit". Tests: tests/antfarm-k7.test.mjs.
//
// Units: world units for distance, seconds for time. y may point either way.
//
//   const line = makeLine({ speed: 6, seed: 7 })
//   line.place(id, { x, y, spot })          A node. spot(rnd) returns [x, y], a standing point near it.
//   line.road(a, b, pts, { id, cost })       An edge from place a to place b. pts: flat [x0, y0, ...] from a to b.
//   line.reshape(roadId, pts)                New points for a road; walkers on it keep their old copy.
//   line.move(placeId, x, y)                 Moves a place.
//   line.unroad(roadId)
//   line.store(id, { at, cap, n })           A stock at a place. n may be fractional; a haul moves whole units.
//   line.step(id, { at, takes, gives, time, hands, job, auto, prio, pace, done })
//                                            A process at a place. takes and gives map store ids to counts.
//                                            hands: workers at once. auto: runs with no worker, that many at once.
//                                            pace(): a speed factor. done(step, worker): runs after each output.
//   line.haul(id, { from, to, n, job, slack, prio, item })
//                                            Carries n units from store to store. slack lets carriers set off
//                                            while the target is full; they wait in a queue at its door.
//   line.unstep(id) / line.unhaul(id)
//   line.hire({ at, jobs, home, size, data }) A worker at a place. jobs: a Set of job names, or null for every job.
//   line.call(id, secs, weight)              The hand asks for workers at a step, a haul or a place.
//   line.milestone(id, { test, then })       test(line) once a second; then(line, loading) runs once.
//   line.tick(dt)                            Advances the line by dt seconds, times line.pace.
//   line.on(event, fn)                       hire(w) start(w, task) pick(w, haul) drop(w, haul) wait(w, store)
//                                            made(step, w) milestone(id)
//   line.save() / line.load(obj)             Stocks, milestones and workers (with w.data). Tasks in flight drop.
//
// A worker: { id, x, y, ang, state, task, carry, at, size, home, walk, work, queue, data }.
// state: idle, go (to a task), work, carry, wait (in a queue), home (walking home).

export function makeLine({ speed = 6, seed = 1 } = {}) {
  let rs = (seed >>> 0) || 1;
  const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const places = new Map(), roads = new Map(), stores = new Map(), steps = new Map(), hauls = new Map(), miles = new Map();
  const workers = [], calls = new Map(), handlers = {};
  let t = 0, nid = 1, schedT = 0, mileT = 0, rr = 0;
  let cache = new Map();
  const emit = (name, ...args) => { const l = handlers[name]; if (l) for (const f of l) f(...args); };

  /* ---------- paths ---------- */
  // A path is a flat point list with its running length.
  function path(pts) {
    const n = pts.length >> 1, cum = new Float32Array(Math.max(1, n));
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
    return { pts, cum, len: cum[n - 1] || 0 };
  }
  // The point and heading at distance s along a path.
  function along(p, s, out) {
    const { pts, cum } = p, n = cum.length;
    if (n < 2) { out.x = pts[0]; out.y = pts[1]; return out; }
    s = Math.max(0, Math.min(p.len, s));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, k = (s - cum[lo]) / seg;
    const ax = pts[2 * lo], ay = pts[2 * lo + 1], bx = pts[2 * hi], by = pts[2 * hi + 1];
    out.x = ax + (bx - ax) * k; out.y = ay + (by - ay) * k;
    if (bx !== ax || by !== ay) out.ang = Math.atan2(by - ay, bx - ax);
    return out;
  }

  /* ---------- routes: Dijkstra on the small road graph, cached ---------- */
  function route(a, b) {
    if (a === b) { const p = places.get(a); return p ? [p.x, p.y] : null; }
    const key = a + '\u0001' + b;
    if (cache.has(key)) return cache.get(key);
    const dist = new Map([[a, 0]]), prev = new Map(), done = new Set();
    for (;;) {
      let u = null, best = Infinity;
      for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k; }
      if (u === null || u === b) break;
      done.add(u);
      for (const r of roads.values()) {
        const v = r.a === u ? r.b : r.b === u ? r.a : null;
        if (v === null || done.has(v)) continue;
        const d = best + r.p.len * r.cost;
        if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, r); }
      }
    }
    let out = null;
    if (prev.has(b)) {
      const legs = [];
      for (let v = b; v !== a;) {
        const r = prev.get(v);
        legs.push(r.a === v ? reverse(r.p.pts) : r.p.pts);
        v = r.a === v ? r.b : r.a;
      }
      out = [];
      for (let i = legs.length - 1; i >= 0; i--) {
        const L = legs[i];
        for (let j = out.length ? 2 : 0; j < L.length; j++) out.push(L[j]);
      }
    }
    cache.set(key, out);
    return out;
  }
  const reverse = pts => { const o = new Array(pts.length); for (let i = 0; i < pts.length; i += 2) { o[pts.length - 2 - i] = pts[i]; o[pts.length - 1 - i] = pts[i + 1]; } return o; };

  // Sends a worker from where it stands to a place, then on to an optional point.
  function send(w, to, tail = null) {
    const from = w.at ?? nearest(w.x, w.y);
    const r = route(from, to);
    if (!r) return false;
    const pts = [w.x, w.y, ...r];
    if (tail) pts.push(tail[0], tail[1]);
    w.path = path(pts);
    w.s = 0;
    w.at = null;
    w.dest = to;
    return true;
  }
  function nearest(x, y) {
    let best = null, bd = Infinity;
    for (const p of places.values()) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p.id; } }
    return best;
  }
  const spotAt = id => { const p = places.get(id); return p.spot ? p.spot(rnd) : [p.x, p.y]; };

  /* ---------- the parts ---------- */
  const line = {
    places, roads, stores, steps, hauls, workers, rnd, route,
    pace: 1, speed,
    get t() { return t; },
    on(name, fn) { (handlers[name] ??= []).push(fn); return line; },
    place(id, { x, y, spot = null } = {}) { places.set(id, { id, x, y, spot }); cache = new Map(); return places.get(id); },
    move(id, x, y) { const p = places.get(id); if (p) { p.x = x; p.y = y; } cache = new Map(); },
    road(a, b, pts = null, { id = `${a}-${b}`, cost = 1 } = {}) {
      const A = places.get(a), B = places.get(b);
      const r = { id, a, b, cost, p: path(pts ?? [A.x, A.y, B.x, B.y]) };
      roads.set(id, r);
      cache = new Map();
      return r;
    },
    reshape(id, pts) { const r = roads.get(id); if (r) r.p = path(pts); cache = new Map(); },
    unroad(id) { roads.delete(id); cache = new Map(); },
    store(id, { at, cap = Infinity, n = 0 } = {}) {
      const s = stores.get(id) ?? { id, n, out: 0, in: 0, q: [], made: 0 };
      Object.assign(s, { at, cap });
      stores.set(id, s);
      return s;
    },
    step(id, { at, takes = {}, gives = {}, time = 1, hands = 1, job = id, auto = 0, prio = 1, pace = null, done = null } = {}) {
      const s = { kind: 'step', id, at, takes, gives, time, hands, job, auto, prio, pace, done, busy: 0, runs: [], count: 0 };
      steps.set(id, s);
      return s;
    },
    unstep(id) { const s = steps.get(id); if (!s) return; steps.delete(id); for (const w of workers) if (w.task === s) drop(w); },
    haul(id, { from, to, n = 1, job = 'carry', slack = 4, prio = 1, item = from } = {}) {
      const h = { kind: 'haul', id, from, to, n, job, slack, prio, item, busy: 0, count: 0 };
      hauls.set(id, h);
      return h;
    },
    unhaul(id) { const h = hauls.get(id); if (!h) return; hauls.delete(id); for (const w of workers) if (w.task === h) drop(w); },
    hire({ at, jobs = null, home = null, size = 1, data = {} } = {}) {
      const p = places.get(at);
      const [x, y] = spotAt(at);
      const w = { id: nid++, x, y, ang: rnd() * 6.283, state: 'idle', task: null, carry: null, at, size, home: home ?? at,
        jobs, walk: rnd() * 10, work: 0, queue: -1, idle: 0, data, path: null, s: 0, dest: null, seed: rnd() };
      if (!p) return null;
      workers.push(w);
      emit('hire', w);
      return w;
    },
    call(id, secs = 30, weight = 3) { calls.set(id, { until: t + secs, weight }); },
    called(id) { const c = calls.get(id); return c && c.until > t ? c : null; },
    milestone(id, { test, then }) { miles.set(id, { id, test, then, done: false }); },
    reached(id) { return !!miles.get(id)?.done; },
    fill(id) { const s = stores.get(id); return s ? (s.cap === Infinity ? 0 : s.n / s.cap) : 0; },
    tick,
    save() {
      return {
        t, nid,
        stores: Object.fromEntries([...stores].map(([k, s]) => [k, +s.n.toFixed(3)])),
        made: Object.fromEntries([...stores].map(([k, s]) => [k, s.made])),
        miles: [...miles.values()].filter(m => m.done).map(m => m.id),
        workers: workers.map(w => ({ at: w.at ?? w.dest ?? nearest(w.x, w.y), size: w.size, home: w.home, jobs: w.jobs ? [...w.jobs] : null, data: w.data })),
      };
    },
    load(o) {
      if (!o) return;
      t = o.t ?? 0;
      for (const id of o.miles ?? []) { const m = miles.get(id); if (m && !m.done) { m.done = true; m.then(line, true); } }
      for (const [k, n] of Object.entries(o.stores ?? {})) { const s = stores.get(k); if (s) s.n = Math.min(n, s.cap); }
      for (const [k, n] of Object.entries(o.made ?? {})) { const s = stores.get(k); if (s) s.made = n; }
      workers.length = 0;
      for (const w of o.workers ?? []) {
        if (!places.has(w.at)) continue;
        const h = line.hire({ at: w.at, size: w.size, home: places.has(w.home) ? w.home : w.at, jobs: w.jobs ? new Set(w.jobs) : null, data: w.data ?? {} });
        if (h) h.idle = 99;
      }
    },
  };

  /* ---------- tasks: who can take what ---------- */
  const free = s => s.n - s.out;
  const room = s => s.cap - s.n - s.in;
  function canStep(s) {
    if (!places.has(s.at)) return false;
    for (const [k, n] of Object.entries(s.takes)) { const st = stores.get(k); if (!st || free(st) < n - 1e-6) return false; }
    for (const [k, n] of Object.entries(s.gives)) { const st = stores.get(k); if (!st || room(st) < n - 1e-6) return false; }
    return true;
  }
  function canHaul(h) {
    const a = stores.get(h.from), b = stores.get(h.to);
    if (!a || !b || !places.has(a.at) || !places.has(b.at)) return false;
    return free(a) >= h.n - 1e-6 && room(b) + h.slack >= h.n;
  }
  function reserve(s) {
    for (const [k, n] of Object.entries(s.takes)) stores.get(k).out += n;
    for (const [k, n] of Object.entries(s.gives)) stores.get(k).in += n;
  }
  function consume(s) {
    for (const [k, n] of Object.entries(s.takes)) { const st = stores.get(k); if (st) { st.n -= n; st.out -= n; } }
  }
  function yieldOf(s, w) {
    for (const [k, n] of Object.entries(s.gives)) { const st = stores.get(k); if (st) { st.n += n; st.in -= n; st.made += n; } }
    s.count++;
    emit('made', s, w);
    s.done?.(s, w);
  }
  const workTime = s => s.time / Math.max(0.05, (s.pace ? s.pace(line) : 1));

  // Puts a task down: reservations return, the worker goes idle where it stands.
  function drop(w) {
    const k = w.task;
    if (k?.kind === 'step') {
      k.busy--;
      if (w.state !== 'work') for (const [id, n] of Object.entries(k.takes)) { const st = stores.get(id); if (st) st.out -= n; }
      for (const [id, n] of Object.entries(k.gives)) { const st = stores.get(id); if (st) st.in -= n; }
    } else if (k?.kind === 'haul') {
      k.busy--;
      const a = stores.get(k.from), b = stores.get(k.to);
      if (!w.carry && a) a.out -= k.n;
      if (b) { b.in -= k.n; const i = b.q.indexOf(w); if (i >= 0) b.q.splice(i, 1); }
    }
    w.task = null; w.carry = null; w.state = 'idle'; w.queue = -1; w.idle = 0;
    w.at = nearest(w.x, w.y); w.path = null;
  }

  function score(w, k) {
    let need, at;
    if (k.kind === 'step') {
      const first = Object.keys(k.takes)[0], st = first && stores.get(first);
      need = 1 + (st ? Math.min(1.5, st.n / Math.max(1, st.cap === Infinity ? 20 : st.cap)) : 0) + (k.busy === 0 ? 0.5 : 0);
      at = places.get(k.at);
    } else {
      const a = stores.get(k.from), b = stores.get(k.to);
      need = 0.6 + Math.min(1.2, a.n / Math.max(1, a.cap === Infinity ? 20 : a.cap)) - 0.5 * Math.min(1, b.n / Math.max(1, b.cap === Infinity ? 1e9 : b.cap));
      at = places.get(a.at);
    }
    need *= k.prio;
    const c = line.called(k.id) || line.called(k.kind === 'step' ? k.at : stores.get(k.to)?.at);
    if (c) need *= 1 + c.weight;
    const d = Math.hypot(at.x - w.x, at.y - w.y);
    return need / (1 + d / 60);
  }

  function assign(w) {
    let best = null, bs = 0;
    for (const s of steps.values()) {
      if (s.auto || s.busy >= s.hands || (w.jobs && !w.jobs.has(s.job)) || !canStep(s)) continue;
      const v = score(w, s);
      if (v > bs) { bs = v; best = s; }
    }
    for (const h of hauls.values()) {
      if ((w.jobs && !w.jobs.has(h.job)) || !canHaul(h)) continue;
      const v = score(w, h);
      if (v > bs) { bs = v; best = h; }
    }
    if (!best) return false;
    if (best.kind === 'step') {
      if (!send(w, best.at, spotAt(best.at))) return false;
      reserve(best);
    } else {
      const a = stores.get(best.from), b = stores.get(best.to);
      if (!send(w, a.at)) return false;
      a.out += best.n; b.in += best.n;
    }
    best.busy++;
    w.task = best; w.state = 'go'; w.idle = 0;
    emit('start', w, best);
    return true;
  }

  /* ---------- the clock ---------- */
  const pt = { x: 0, y: 0, ang: 0 };
  function walk(w, dt, to = Infinity) {
    if (!w.path) return true;
    const v = line.speed * line.pace * (0.8 + 0.4 * w.seed) * dt;
    const goal = Math.min(to, w.path.len);
    const s0 = w.s;
    w.s = w.s < goal ? Math.min(goal, w.s + v) : Math.max(goal, w.s - v);
    w.walk += Math.abs(w.s - s0);
    pt.ang = w.ang;
    along(w.path, w.s, pt);
    w.x = pt.x; w.y = pt.y;
    if (w.s !== s0) w.ang = w.s > s0 ? pt.ang : pt.ang + Math.PI;
    return w.s >= w.path.len - 1e-4;
  }

  function tick(dt) {
    const d = dt * line.pace;
    t += d;
    // Auto steps run with no worker.
    for (const s of steps.values()) {
      if (!s.auto) continue;
      for (let i = s.runs.length - 1; i >= 0; i--) {
        s.runs[i] -= d;
        if (s.runs[i] <= 0) { s.runs.splice(i, 1); yieldOf(s, null); }
      }
      while (s.runs.length < s.auto && canStep(s)) { reserve(s); consume(s); s.runs.push(workTime(s)); }
    }
    for (const w of workers) {
      const k = w.task;
      if (k && ((k.kind === 'step' && !steps.has(k.id)) || (k.kind === 'haul' && !hauls.has(k.id)))) drop(w);
      switch (w.state) {
        case 'idle': {
          w.idle += d;
          if (w.path && walk(w, dt)) { w.path = null; w.at = w.dest ?? w.at; }
          if (!w.path && w.idle > 4 && w.home && w.at !== w.home && places.has(w.home) && rnd() < d * 0.5) {
            if (send(w, w.home, spotAt(w.home))) w.state = 'home';
          }
          break;
        }
        case 'home':
          if (walk(w, dt)) { w.state = 'idle'; w.path = null; w.at = w.dest; w.idle = 0; }
          break;
        case 'go':
          if (walk(w, dt)) {
            w.at = w.dest;
            if (k.kind === 'step') { consume(k); w.state = 'work'; w.work = workTime(k); emit('start-work', w, k); }
            else {
              const a = stores.get(k.from);
              a.n -= k.n; a.out -= k.n;
              w.carry = k.item;
              emit('pick', w, k);
              const b = stores.get(k.to);
              if (!send(w, b.at)) { drop(w); break; }
              w.state = 'carry';
            }
          }
          break;
        case 'work':
          w.work -= d;
          if (w.work <= 0) { w.task = null; k.busy--; w.state = 'idle'; w.idle = 0; yieldOf(k, w); }
          break;
        case 'carry': {
          const b = stores.get(k.to);
          if (walk(w, dt)) {
            w.at = w.dest;
            if (b.n + k.n <= b.cap + 1e-6 && b.q.length === 0) land(w, k, b);
            else { b.q.push(w); w.state = 'wait'; emit('wait', w, b); }
          }
          break;
        }
        case 'wait': {
          const b = stores.get(k.to);
          const i = b.q.indexOf(w);
          w.queue = i;
          if (i === 0 && b.n + k.n <= b.cap + 1e-6) {
            if (walk(w, dt)) { b.q.shift(); land(w, k, b); }
          } else walk(w, dt, w.path.len - (i + 1) * 3.2);
          break;
        }
      }
    }
    // Idle workers look for work a few at a time, so a big colony stays cheap.
    schedT -= d;
    if (schedT <= 0) {
      schedT = 0.15;
      const n = workers.length;
      let tries = Math.min(n, 48);
      for (let j = 0; j < n && tries > 0; j++) {
        const w = workers[(rr + j) % n];
        if (w.state !== 'idle' || w.idle < 0.35) continue;
        tries--;
        if (w.path) { w.at = nearest(w.x, w.y); w.path = null; }
        assign(w);
      }
      rr = (rr + 48) % Math.max(1, n);
    }
    mileT -= d;
    if (mileT <= 0) {
      mileT = 1;
      for (const m of miles.values()) if (!m.done && m.test(line)) { m.done = true; m.then(line, false); emit('milestone', m.id); }
    }
  }
  function land(w, k, b) {
    b.n += k.n; b.in -= k.n; b.made += k.n;
    w.carry = null; w.task = null; k.busy--; k.count++;
    w.state = 'idle'; w.idle = 0; w.queue = -1; w.path = null;
    emit('drop', w, k);
  }

  return line;
}
