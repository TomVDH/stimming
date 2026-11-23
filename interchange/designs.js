// Interchange trails: the road network of each design.
// Two motorways cross at the origin. Units are metres; x east, y north.
// Traffic keeps right. Each road has two lanes each way.
// A design gives the ramps that leave the northbound road.
// The builder turns them by 90 degrees for the other three roads.

// Lane centres from the road's axis: inner, outer.
export const LANE_X = [4.8, 8.4];
export const LANE_W = 3.6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Direction d: 0 north, 1 west, 2 south, 3 east. Turn k quarter turns anticlockwise.
const rot = ([x, y], k) => {
  k = ((k % 4) + 4) % 4;
  return k === 0 ? [x, y] : k === 1 ? [-y, x] : k === 2 ? [-x, -y] : [y, -x];
};
// A point on lane i of road d, t metres along it from the crossing.
const lanePt = (d, i, t) => rot([LANE_X[i], t], d);
const laneDir = d => rot([0, 1], d);

/* ---------- curve pieces, in the northbound frame ---------- */
const norm = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
// A cubic from a to b; da and db are unit tangents; k1 and k2 pull the handles.
function bez(a, da, b, db, k1, k2 = k1) {
  const p1 = [a[0] + da[0] * k1, a[1] + da[1] * k1], p2 = [b[0] - db[0] * k2, b[1] - db[1] * k2];
  const out = [], n = 64;
  for (let j = 0; j <= n; j++) {
    const t = j / n, u = 1 - t;
    const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
    out.push([w0 * a[0] + w1 * p1[0] + w2 * p2[0] + w3 * b[0], w0 * a[1] + w1 * p1[1] + w2 * p2[1] + w3 * b[1]]);
  }
  return out;
}
// An arc or spiral about c: the radius runs r0 to r1 as the angle runs a0 to a1.
function spiral(c, r0, r1, a0, a1) {
  const out = [], n = Math.max(16, Math.ceil(Math.abs(a1 - a0) * Math.max(r0, r1) / 2));
  for (let j = 0; j <= n; j++) {
    const t = j / n, a = a0 + (a1 - a0) * t, r = r0 + (r1 - r0) * t;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}
// The unit tangent of a spiral at angle a, in the travel direction.
function spiralDir(r0, r1, a0, a1, a) {
  const dr = (r1 - r0) / (a1 - a0), r = r0 + dr * (a - a0), s = Math.sign(a1 - a0);
  return norm([s * (dr * Math.cos(a) - r * Math.sin(a)), s * (dr * Math.sin(a) + r * Math.cos(a))]);
}
const join = (...parts) => parts.reduce((all, p) => all.concat(all.length ? p.slice(1) : p), []);

/* ---------- the designs ---------- */
// Each ramp: from [road, lane, t], to [road, lane, t], its points, its speed, its height.
// z(u) gives the deck height along the ramp, u from 0 to 1, in levels.
const N = [0, 1], E = [1, 0], W = [-1, 0];

function cloverleaf() {
  const o = 8, r = 34, c = LANE_X[1] + o + r;
  // Right turns: a wide sweep outside the loop.
  const right = bez(lanePt(0, 1, -230), N, lanePt(3, 1, 230), E, 72);
  // Left turns: on past the bridge, then a loop of 270 degrees to the right.
  const a0 = Math.PI, a1 = -Math.PI / 2;
  const left = join(
    bez(lanePt(0, 1, 16), N, [c - r, c], N, 13),
    spiral([c, c], r, r, a0, a1),
    bez([c, c - r], W, lanePt(1, 1, -16), W, 13),
  );
  return {
    name: 'Cloverleaf',
    // The north-south road rides over the east-west road.
    laneZ: (d, t) => (d % 2 === 0 ? 1 - smooth(14, 34, Math.abs(t)) : 0),
    ramps: [
      { from: [0, 1, -230], to: [3, 1, 230], pts: right, v0: 19, kind: 'ramp', move: 'right' },
      { from: [0, 1, 16], to: [1, 1, -16], pts: left, v0: 10.5, kind: 'loop', move: 'left' },
    ],
  };
}

function turbine() {
  // Left turns: each sweeps round the centre on a falling spiral.
  // Each swirl turns 150 degrees; a reverse curve at each end squares it with its road.
  const r0 = 74, r1 = 44, a0 = -Math.PI / 3, a1 = Math.PI * 5 / 6;
  const s0 = [r0 * Math.cos(a0), r0 * Math.sin(a0)], s1 = [r1 * Math.cos(a1), r1 * Math.sin(a1)];
  const left = join(
    bez(lanePt(0, 1, -205), N, s0, spiralDir(r0, r1, a0, a1, a0), 55, 40),
    spiral([0, 0], r0, r1, a0, a1),
    bez(s1, spiralDir(r0, r1, a0, a1, a1), lanePt(1, 1, 205), W, 40, 55),
  );
  const right = bez(lanePt(0, 1, -290), N, lanePt(3, 1, 290), E, 90);
  return {
    name: 'Turbine',
    // The east-west road crosses high over the centre; the swirls ride between.
    laneZ: (d, t) => (d % 2 === 1 ? 3 * (1 - smooth(60, 130, Math.abs(t))) : 0),
    ramps: [
      { from: [0, 1, -290], to: [3, 1, 290], pts: right, v0: 20, kind: 'ramp', move: 'right' },
      { from: [0, 1, -205], to: [1, 1, 205], pts: left, v0: 17, kind: 'swirl', move: 'left', z: u => 1.4 + 0.6 * u },
    ],
  };
}

function stack() {
  // Left turns: one wide curve each, all four crossing high over the centre.
  const R = 82, x0 = 22, y0 = -60;
  const c = [x0 - R, y0];
  const left = join(
    bez(lanePt(0, 1, -175), N, [x0, y0], N, 42),
    spiral(c, R, R, 0, Math.PI / 2),
    bez([c[0], c[1] + R], W, lanePt(1, 1, 175), W, 42),
  );
  const right = bez(lanePt(0, 1, -265), N, lanePt(3, 1, 265), E, 62);
  return {
    name: 'Stack',
    laneZ: (d, t) => (d % 2 === 1 ? 1 - smooth(16, 40, Math.abs(t)) : 0),
    ramps: [
      { from: [0, 1, -265], to: [3, 1, 265], pts: right, v0: 20, kind: 'ramp', move: 'right' },
      { from: [0, 1, -175], to: [1, 1, 175], pts: left, v0: 18, kind: 'flyover', move: 'left', level: k => 2 + (k % 2) },
    ],
  };
}

// Megastack: the stack, plus a carpool flyover from the inner lane and a U-turn loop at each end.
// Five deck levels, after the big stacks of Los Angeles and the knots of Shenzhen and Chongqing.
function megastack() {
  const base = stack();
  // The carpool flyover leaves the inner lane to the left, climbs over the median and sweeps wide.
  const R = 112, y0 = -112, xm = 1.2;
  const c = [xm - R, y0];
  const hov = join(
    bez(lanePt(0, 0, -310), N, [xm, -190], N, 40),
    [[xm, -190], [xm, y0]],
    spiral(c, R, R, 0, Math.PI / 2),
    [[c[0], c[1] + R], [-190, c[1] + R]],
    bez([-190, c[1] + R], W, lanePt(1, 0, 310), W, 40),
  );
  // The U-turn: off to the right past the crossing, a tight loop over both carriageways, back on.
  const xo = 40, yo = 150, xi = -13, rr = (xo - xi) / 2, cx = (xo + xi) / 2;
  const uturn = join(
    bez(lanePt(0, 1, 60), N, [xo, yo], N, 40),
    spiral([cx, yo], rr, rr, 0, Math.PI),
    bez([xi, yo], [0, -1], lanePt(2, 1, -110), [0, -1], 18),
  );
  return {
    name: 'Megastack',
    laneZ: base.laneZ,
    ramps: [
      ...base.ramps,
      { from: [0, 0, -310], to: [1, 0, 310], pts: hov, v0: 23, kind: 'flyover', move: 'hov', level: () => 5 },
      { from: [0, 1, 60], to: [2, 1, -110], pts: uturn, v0: 9, kind: 'loop', move: 'uturn', level: () => 2 },
    ],
  };
}

export const DESIGNS = { cloverleaf, turbine, stack, megastack };
export const ORDER = ['cloverleaf', 'turbine', 'stack', 'megastack'];

/* ---------- the builder ---------- */
// Resamples a polyline to points about 1 m apart.
function resample(pts) {
  const cum = [0];
  for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
  const len = cum[cum.length - 1], n = Math.max(2, Math.ceil(len) + 1), step = len / (n - 1);
  const xy = new Float32Array(n * 2);
  let j = 0;
  for (let q = 0; q < n; q++) {
    const s = q * step;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = clamp((s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), 0, 1);
    xy[q * 2] = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f;
    xy[q * 2 + 1] = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f;
  }
  return { xy, len, step, n };
}

/**
 * Builds the network: links, paths and lane ends.
 * @param {string} id A key of DESIGNS.
 * @param {number} reach How far each lane runs from the crossing, in metres.
 */
export function buildNet(id, reach) {
  const D = DESIGNS[id]();
  const links = [], paths = [];
  const link = (pts, o) => {
    const r = resample(pts);
    const l = { id: links.length, ...r, z: new Float32Array(r.n), next: [], prev: [], cars: [], ...o };
    links.push(l);
    return l;
  };
  // Cuts on each lane: where a ramp leaves or joins.
  const cuts = new Map();
  const key = (d, i) => d * 2 + i;
  const addCut = (d, i, t) => { const k = key(d, i); if (!cuts.has(k)) cuts.set(k, new Set()); cuts.get(k).add(t); };
  const ramps = [];
  for (let k = 0; k < 4; k++) {
    for (const R of D.ramps) {
      const from = [(R.from[0] + k) % 4, R.from[1], R.from[2]], to = [(R.to[0] + k) % 4, R.to[1], R.to[2]];
      addCut(...from); addCut(...to);
      ramps.push({ R, k, from, to, pts: R.pts.map(p => rot(p, k)) });
    }
  }
  // Lane links: each lane cut at its ramp ends.
  const laneLinks = new Map();
  for (let d = 0; d < 4; d++) for (let i = 0; i < 2; i++) {
    const ts = [-reach, ...[...(cuts.get(key(d, i)) || [])].sort((a, b) => a - b), reach];
    const list = [];
    for (let j = 0; j + 1 < ts.length; j++) {
      const l = link([lanePt(d, i, ts[j]), lanePt(d, i, ts[j + 1])], { kind: 'lane', major: true, v0: 31, road: d, lane: i, t0: ts[j], t1: ts[j + 1] });
      for (let q = 0; q < l.n; q++) l.z[q] = D.laneZ(d, ts[j] + (ts[j + 1] - ts[j]) * q / (l.n - 1));
      if (list.length) { list[list.length - 1].next.push(l.id); l.prev.push(list[list.length - 1].id); }
      list.push(l);
    }
    laneLinks.set(key(d, i), list);
  }
  const at = (d, i, t, end) => laneLinks.get(key(d, i)).find(l => (end ? l.t1 : l.t0) === t);
  // Ramp links, joined to the lanes at their cuts.
  for (const { R, k, from, to, pts } of ramps) {
    const l = link(pts, { kind: R.kind, major: false, v0: R.v0, road: from[0], move: R.move });
    const zA = D.laneZ(from[0], from[2]), zB = D.laneZ(to[0], to[2]);
    const top = R.level ? R.level(k) : null;
    for (let q = 0; q < l.n; q++) {
      const u = q / (l.n - 1);
      let z = zA + (zB - zA) * u;
      // A flyover climbs to its own level and comes back down.
      if (top != null) z = Math.max(z, top * smooth(0, 0.3, u) * smooth(1, 0.7, u));
      else if (R.z) z = Math.max(z, R.z(u) * smooth(0, 0.2, u) * smooth(1, 0.8, u));
      l.z[q] = z;
    }
    const a = at(from[0], from[1], from[2], true), b = at(to[0], to[1], to[2], false);
    a.next.push(l.id); l.prev.push(a.id);
    l.next.push(b.id); b.prev.push(l.id);
    l.from = a.id; l.to = b.id;
  }
  // Paths: through on each lane, and each ramp from its lane's start.
  for (let d = 0; d < 4; d++) for (let i = 0; i < 2; i++) {
    const list = laneLinks.get(key(d, i));
    paths.push({ road: d, lane: i, move: 'through', links: list.map(l => l.id) });
  }
  for (const l of links) {
    if (l.kind === 'lane') continue;
    const a = links[l.from], b = links[l.to];
    const head = laneLinks.get(key(a.road, a.lane)), tail = laneLinks.get(key(b.road, b.lane));
    paths.push({
      road: a.road, lane: a.lane, move: l.move,
      links: [...head.slice(0, head.indexOf(a) + 1).map(x => x.id), l.id, ...tail.slice(tail.indexOf(b)).map(x => x.id)],
    });
  }
  for (const p of paths) {
    p.len = p.links.reduce((s, id) => s + links[id].len, 0);
  }
  return { id, name: D.name, links, paths, reach };
}

// Position and heading on a link at distance s.
export function linkPose(l, s, out) {
  const f = clamp(s / l.step, 0, l.n - 1.0001), j = Math.floor(f), u = f - j;
  const x0 = l.xy[j * 2], y0 = l.xy[j * 2 + 1], x1 = l.xy[j * 2 + 2], y1 = l.xy[j * 2 + 3];
  const dx = x1 - x0, dy = y1 - y0, m = Math.hypot(dx, dy) || 1;
  out[0] = x0 + dx * u; out[1] = y0 + dy * u; out[2] = dx / m; out[3] = dy / m;
  out[4] = l.z[j] + (l.z[j + 1] - l.z[j]) * u;
  return out;
}
