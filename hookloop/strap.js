// Hook and loop: the strap model. No three.js here; node can test it.
// Units are millimetres and seconds. x runs along the strap, y up, z across.
// The hook tape is a chain of nodes in the x-y plane, solved by position-based dynamics.
// Engagement sites hold the chain down; each one snaps past its break length.

export const STRAP = {
  L: 150,          // hook tape length
  W: 25,           // strap width
  ds: 1.25,        // node spacing along the tape
  stitch: 6,       // stitched length at the far end; it never peels
  tab: 10,         // tab length at the free end; it has no hooks
  base: 0.7,       // loop tape backing thickness
  pile: 1.25,      // loop pile height above the backing
  back: 0.55,      // hook tape backing thickness
  hookH: 0.8,      // hook height under the hook backing
  perMm: 18,       // engagement sites per millimetre of length
};
// Centre line of the closed hook backing.
STRAP.home = STRAP.base + STRAP.pile + 0.1 + STRAP.back / 2;
STRAP.pileTop = STRAP.base + STRAP.pile;
STRAP.x0 = -STRAP.L / 2;

const H = 1 / 240;                 // substep
// Gravity is light: the stiff tape and the air slow its fall.
const G = -4000;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Small seeded random, so every strap is the same strap.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeStrap({ seed = 7, grip = 0.6 } = {}) {
  const S = STRAP;
  const n = Math.round(S.L / S.ds) + 1;
  const x = new Float32Array(n), y = new Float32Array(n);
  const px = new Float32Array(n), py = new Float32Array(n);
  const hx = new Float32Array(n);           // home x of each node
  const w = new Float32Array(n);            // inverse mass
  const held = new Uint16Array(n);          // engaged sites per node
  const curl = new Float32Array(n);         // set curl after a peel, in mm of lift
  for (let i = 0; i < n; i++) {
    hx[i] = S.x0 + i * S.ds;
    x[i] = px[i] = hx[i];
    y[i] = py[i] = S.home;
    w[i] = i * S.ds <= S.stitch ? 0 : 1;
  }
  // The tab curls up a little, as a used strap does.
  const tabFrom = S.L - S.tab;
  for (let i = 0; i < n; i++) {
    const s = i * S.ds - tabFrom;
    if (s > 0) { const k = s / S.tab; y[i] = py[i] = S.home + 0.9 * k * k + 0.15 * k; }
  }
  // Engagement sites: arc position, across position, break length.
  const r = rng(seed);
  const count = Math.round((tabFrom - S.stitch) * S.perMm);
  const sites = {
    n: count,
    s: new Float32Array(count),
    z: new Float32Array(count),
    brk: new Float32Array(count),     // break stretch at grip 1
    seed: new Float32Array(count),
    state: new Uint8Array(count),     // 0 engaged, 1 springing, 2 loose
    t: new Float32Array(count),       // time since snap
    amp: new Float32Array(count),     // stretch at the snap
  };
  for (let j = 0; j < count; j++) {
    sites.s[j] = S.stitch + (j + r()) / S.perMm;
    sites.z[j] = (r() - 0.5) * (S.W - 1.6);
    // Most loops let go early; a few hold long and crack loud.
    const u = r();
    sites.brk[j] = 0.9 + 3.2 * u * u + 0.5 * r();
    sites.seed[j] = r();
  }
  for (let j = 0; j < count; j++) held[nodeOf(sites.s[j])]++;
  function nodeOf(s) { return clamp(Math.round(s / S.ds), 0, n - 1); }

  return {
    n, x, y, px, py, hx, w, held, curl, sites,
    grip,
    calm: false,
    hand: null,        // { i, tx, ty } while the tab is held
    thumb: null,       // { x, z, p } while a press seals
    events: [],
    front: tabFrom,    // arc length of the peel line
    snapRate: 0,       // snaps per second, smoothed
    sealRate: 0,
    loose: 0,          // how open the strap lies, 0 closed to 1 open
    nodeOf,
  };
}

// Tape point and unit normal at arc length s.
export function at(st, s, out) {
  const f = clamp(s / STRAP.ds, 0, st.n - 1.001);
  const i = Math.floor(f), k = f - i;
  const x = st.x[i] + (st.x[i + 1] - st.x[i]) * k;
  const y = st.y[i] + (st.y[i + 1] - st.y[i]) * k;
  let tx = st.x[i + 1] - st.x[i], ty = st.y[i + 1] - st.y[i];
  const l = Math.hypot(tx, ty) || 1;
  tx /= l; ty /= l;
  out[0] = x; out[1] = y; out[2] = -ty; out[3] = tx;
  return out;
}

// Stretch of one site: hook tip to loop root, less the slack.
const P = [0, 0, 0, 0];
export function stretchOf(st, j) {
  const S = STRAP, sites = st.sites;
  at(st, sites.s[j], P);
  const tipX = P[0] - P[2] * (S.back / 2 + S.hookH * 0.75);
  const tipY = P[1] - P[3] * (S.back / 2 + S.hookH * 0.75);
  const rootX = S.x0 + sites.s[j], rootY = S.pileTop - 0.35;
  return Math.hypot(tipX - rootX, tipY - rootY) - 0.62;
}

export function grab(st, i, tx, ty) {
  st.hand = { i, tx, ty };
  st.events.push({ type: 'grab', x: st.x[i] });
}
export function letGo(st) {
  if (!st.hand) return;
  st.events.push({ type: 'release', x: st.x[st.hand.i] });
  st.hand = null;
}
export function press(st, on, x = 0, z = 0) {
  if (on) {
    if (!st.thumb) st.events.push({ type: 'press', x });
    st.thumb = { x, z, p: st.thumb?.p ?? 0 };
  } else st.thumb = null;
}

// The nearest node to a strap x, along its home line.
export function nodeAtX(st, wx) {
  return clamp(Math.round((wx - STRAP.x0) / STRAP.ds), 0, st.n - 1);
}

export function step(st, dt) {
  const subs = Math.min(14, Math.max(1, Math.ceil(dt / H)));
  for (let k = 0; k < subs; k++) sub(st, H);
  springs(st, subs * H);
  // Rates for the sound: snaps and seals per second, smoothed.
  let sn = 0, se = 0;
  for (const e of st.events) { if (e.type === 'snap') sn++; else if (e.type === 'seal') se++; }
  const a = 1 - Math.exp(-dt / 0.06);
  st.snapRate += (sn / Math.max(dt, 1e-3) - st.snapRate) * a;
  st.sealRate += (se / Math.max(dt, 1e-3) - st.sealRate) * a;
}

// Nodes in the peel zone stay free; deeper nodes are anchored.
const ZONE = 9;
function sub(st, h) {
  const S = STRAP;
  const { n, x, y, px, py, hx, w, held, curl } = st;
  const m = st.m ||= new Float32Array(n);
  const hand = st.hand;
  // A node is anchored when it and the next ZONE nodes all hold hooks.
  let run = 0;
  for (let i = n - 1; i >= 0; i--) {
    run = held[i] > 0 ? run + 1 : 0;
    const anchored = !w[i] || run > ZONE;
    m[i] = anchored || (hand && i === hand.i) ? 0 : 1;
    if (anchored && w[i]) { x[i] = px[i] = hx[i]; y[i] = py[i] = S.home; }
  }
  const damp = 0.985;
  // Predict.
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    const vx = (x[i] - px[i]) * damp, vy = (y[i] - py[i]) * damp;
    px[i] = x[i]; py[i] = y[i];
    x[i] += vx;
    y[i] += vy + G * h * h;
  }
  if (hand) {
    // The tape cannot stretch: keep the hand within reach of the stitch.
    const i0 = Math.round(S.stitch / S.ds);
    const reach = (hand.i - i0) * S.ds * 0.995;
    let dx = hand.tx - x[i0], dy = hand.ty - y[i0];
    const d = Math.hypot(dx, dy);
    if (d > reach) { dx *= reach / d; dy *= reach / d; }
    hand.cx = x[i0] + dx; hand.cy = Math.max(S.home + 0.2, y[i0] + dy);
    x[hand.i] = hand.cx; y[hand.i] = hand.cy;
  }
  const grip = 0.35 + 1.3 * st.grip;
  // Engaged hooks pull each zone node back home, like many small springs.
  // Loops are slack at first, so a node lifts a little before the pull starts.
  for (let i = 0; i < n; i++) {
    if (!m[i] || !held[i]) continue;
    const a = 1 - Math.exp(-held[i] * 0.008 * grip);
    x[i] += (hx[i] - x[i]) * a;
    const lift = y[i] - S.home;
    if (lift > 0.25) y[i] -= (lift - 0.25) * a;
  }
  // A loose flap springs back to lie open over its home, with a set curl.
  if (!hand) {
    const k = 1 - Math.exp(-h / 0.03);
    for (let i = 0; i < n; i++) {
      if (!m[i] || held[i]) continue;
      const d = i * S.ds - st.front;
      if (d <= 0) continue;
      // The lift starts flat at the peel line, so a let-go peels no further.
      const ramp = Math.min(1, d / 16), lift = 6.5 * (1 - Math.exp(-d / 30)) * ramp * ramp * (0.6 + 0.4 * st.loose);
      x[i] += (hx[i] - x[i]) * k * 0.5;
      y[i] += (S.home + 0.4 * ramp + lift - y[i]) * k;
    }
  }
  const link = i => {
    const wa = m[i], wb = m[i + 1], ws = wa + wb;
    if (!ws) return;
    const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i];
    const d = Math.hypot(dx, dy) || 1e-6;
    const c = (d - S.ds) / d / ws;
    x[i] += dx * c * wa; y[i] += dy * c * wa;
    x[i + 1] -= dx * c * wb; y[i + 1] -= dy * c * wb;
  };
  for (let it = 0; it < 12; it++) {
    // Bending: each node leans toward the line of its neighbours, plus its curl.
    // Each bend straightens about its centroid, so the tape keeps its length.
    for (let i = 1; i < n - 1; i++) {
      const wa = m[i - 1], wb = m[i], wc = m[i + 1];
      if (!wb && !wa && !wc) continue;
      const dx = (x[i] - (x[i - 1] + x[i + 1]) / 2) * 0.5, dy = (y[i] - (y[i - 1] + y[i + 1]) / 2) * 0.5;
      const ws = wa * 0.25 + wb + wc * 0.25;
      if (!ws) continue;
      const k = 1 / ws;
      x[i] -= dx * wb * k; y[i] -= dy * wb * k;
      x[i - 1] += dx * wa * 0.5 * k; y[i - 1] += dy * wa * 0.5 * k;
      x[i + 1] += dx * wc * 0.5 * k; y[i + 1] += dy * wc * 0.5 * k;
    }
    // Length: sweeps run from the hand first, so its pull reaches the peel line.
    for (let i = n - 2; i >= 0; i--) link(i);
    for (let i = 0; i < n - 1; i++) link(i);
    // The thumb presses nodes under it onto the pile.
    if (st.thumb) {
      const T = st.thumb;
      for (let i = 0; i < n; i++) {
        if (!m[i]) continue;
        const d = Math.abs(x[i] - T.x);
        if (d > 7) continue;
        y[i] += (S.home - 0.06 - y[i]) * (1 - d / 7) * 0.5;
      }
    }
    // The pile holds the tape up; it gives a little under a press.
    for (let i = 0; i < n; i++) if (m[i] && y[i] < S.home - 0.1) y[i] = S.home - 0.1;
  }
  if (hand) { px[hand.i] = x[hand.i]; py[hand.i] = y[hand.i]; }
  // Friction on the pile: a node that lies down loses its slide.
  for (let i = 0; i < n; i++) {
    if (!m[i] || y[i] > S.home + 0.05) continue;
    px[i] += (x[i] - px[i]) * 0.5;
    py[i] += (y[i] - py[i]) * 0.5;
  }
  sites(st, h);
}

// Each engaged site checks its stretch; past its break length it snaps.
function sites(st, h) {
  const S = STRAP, si = st.sites, { held } = st;
  const grip = 0.45 + 1.1 * st.grip;
  let front = S.L - S.tab;
  for (let j = 0; j < si.n; j++) {
    if (si.state[j] !== 0) continue;
    const i = st.nodeOf(si.s[j]);
    // A node on the pile stretches nothing; skip the costly test.
    if (st.y[i] < S.home + 0.04 && Math.abs(st.x[i] - st.hx[i]) < 0.05 && (i + 1 >= st.n || st.y[i + 1] < S.home + 0.04)) continue;
    const e = stretchOf(st, j);
    if (e > si.brk[j] * grip) {
      si.state[j] = 1; si.t[j] = 0; si.amp[j] = e;
      held[i]--;
      // Peel speed: how fast this part of the tape lifts.
      const vy = (st.y[i] - st.py[i]) / h, vx = (st.x[i] - st.px[i]) / h;
      st.events.push({ type: 'snap', x: S.x0 + si.s[j], z: si.z[j], v: Math.hypot(vx, vy), e });
      // A peeled part keeps a set curl.
      st.curl[i] = Math.min(1, st.curl[i] + 0.12);
    }
  }
  // The peel line: the first loose site from the tab side.
  for (let j = si.n - 1; j >= 0; j--) { if (si.state[j] === 0) { front = si.s[j]; break; } if (j === 0) front = S.stitch; }
  st.front = front;
  st.loose = openShare(st);
  // Under a press, hooks that lie home catch again.
  const T = st.thumb;
  if (T) {
    T.p = Math.min(1, T.p + h * 8);
    for (let j = 0; j < si.n; j++) {
      if (si.state[j] === 0) continue;
      const hxj = S.x0 + si.s[j];
      if (Math.abs(hxj - T.x) > 6 || Math.abs(si.z[j] - T.z) > 11) continue;
      const i = st.nodeOf(si.s[j]);
      if (st.y[i] > S.home + 0.12 || Math.abs(st.x[i] - st.hx[i]) > 0.5) continue;
      if (Math.random() > h * 60 * T.p) continue;
      si.state[j] = 0;
      held[i]++;
      st.curl[i] *= 0.6;
      st.events.push({ type: 'seal', x: hxj, z: si.z[j] });
    }
  }
}

// Snapped fibres spring back for a short time, then lie loose.
export const SPRING_T = 0.45;
function springs(st, dt) {
  const si = st.sites;
  for (let j = 0; j < si.n; j++) {
    if (si.state[j] !== 1) continue;
    si.t[j] += dt;
    if (si.t[j] > SPRING_T) si.state[j] = 2;
  }
}

// Busy while any node moves, a fibre springs, or a hand or thumb acts.
export function busy(st) {
  if (st.hand || st.thumb) return true;
  const si = st.sites;
  for (let j = 0; j < si.n; j++) if (si.state[j] === 1) return true;
  for (let i = 0; i < st.n; i++) {
    if (!st.w[i]) continue;
    if (Math.abs(st.x[i] - st.px[i]) > 1e-3 || Math.abs(st.y[i] - st.py[i]) > 1e-3) return true;
  }
  return false;
}

// Stop all motion once the strap has come to rest.
export function freeze(st) {
  for (let i = 0; i < st.n; i++) { st.px[i] = st.x[i]; st.py[i] = st.y[i]; }
}

export function openShare(st) {
  const S = STRAP;
  return 1 - (st.front - S.stitch) / (S.L - S.tab - S.stitch);
}
