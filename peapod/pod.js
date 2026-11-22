// Pea pod: the simulation. Plain JS with no imports, so node can test it.
// Units are centimetres and seconds; y is up; the table is y = 0.

export const G = 981;
export const POD = { L: 8.6, R: 0.64, bow: 0.42, wall: 0.085 };
// The gap between two pods along the table.
export const GAP = 36;

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// A small seeded random, so a test can repeat a pod.
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

/* ---------- the pod ---------- */
// The pod lies on its back seam. The front seam is on top and splits.
// Each valve turns out about the back seam, like the leaves of a book.
export function makePod(x0, rand = Math.random) {
  const n = 6 + Math.floor(rand() * 3);
  const peas = [];
  const a = 0.15 + rand() * 0.03, b = 0.85 - rand() * 0.03;
  for (let i = 0; i < n; i++) {
    const u = lerp(a, b, (i + 0.5 + (rand() - 0.5) * 0.25) / n);
    // Peas near the ends are smaller: they get less room.
    const end = Math.min(u, 1 - u);
    const r = (0.36 + rand() * 0.07) * lerp(0.86, 1, smooth(0.1, 0.3, end));
    const side = i % 2 ? 1 : -1;
    // The hilum faces the seam where the pea hung, on its own side.
    const ang = side > 0 ? -1.12 : -2.02;
    peas.push({ u, r, side, hue: rand(), out: false, at: 0, q: [Math.sin(ang / 2), 0, 0, Math.cos(ang / 2)] });
  }
  return {
    x0, rand, peas,
    yaw: (rand() - 0.5) * 0.12,
    bowSign: rand() < 0.5 ? -1 : 1,
    // Squeeze state: pressure builds to the snap; the pinch follows it.
    press: 0, held: false, du: 0.5,
    pinch: 0, pinchV: 0,
    // After the snap: the crack front, the valve angles, the twist and the curl.
    split: false, crackT: 0, c0: 0.5, cL: 0.5, cR: 0.5,
    open: [{ a: 0, v: 0, k: 1 }, { a: 0, v: 0, k: 1 }],
    twist: 0, twistV: 0, curl: 0, curlV: 0,
    spring: 0.5, landed: [false, false],
    drop: 0, dropV: 0,
    rest: 0,
  };
}

// The cross section radius at u, before the squeeze.
export function profile(u) {
  // The stem end is blunt and the tip is pointed.
  const s = clamp(u);
  const stem = Math.pow(smooth(0, 0.16, s), 0.55);
  const tip = Math.pow(smooth(1, 0.72, s), 0.8);
  return Math.max(0, stem * tip);
}

// The skin swells over each pea.
export function bumps(pod, u) {
  let k = 0;
  for (const p of pod.peas) {
    const d = (u - p.u) * POD.L / (p.r * 1.25);
    k += Math.exp(-d * d) * (p.r / 0.42);
  }
  return k;
}

// The opening of each slice: the crack must pass before the valve turns.
export function openAt(pod, u) {
  if (!pod.split) return 0;
  const past = u < pod.c0 ? smooth(pod.cL, pod.cL + 0.07, u) : smooth(pod.cR, pod.cR - 0.07, u);
  return past * smooth(0, 0.07, u) * smooth(1, 0.95, u);
}

// The centre line: a bow in the table plane.
export function centre(pod, u, out) {
  const x = (u - 0.5) * POD.L;
  const z = pod.bowSign * POD.bow * (1 - (2 * u - 1) ** 2);
  const c = Math.cos(pod.yaw), s = Math.sin(pod.yaw);
  out[0] = pod.x0 + x * c - z * s;
  out[1] = x * s + z * c;
  // The slope of the bow gives the side normal.
  const dz = pod.bowSign * POD.bow * -4 * (2 * u - 1) / POD.L;
  const tx = c - dz * s, tz = s + dz * c, tl = Math.hypot(tx, tz);
  out[2] = -tz / tl;
  out[3] = tx / tl;
  return out;
}

/* ---------- the world ---------- */
export function makeWorld({ seed = 7 } = {}) {
  const rand = mulberry(seed);
  const w = {
    rand,
    pods: [],
    peas: [],
    drops: [],
    events: [],
    spring: 0.5,
    calm: false,
    // The view pans from one pod to the next.
    view: 0, pan: null,
    time: 0,
    // The pod in play.
    get pod() { return this.pods[this.pods.length - 1]; },
  };
  w.pods.push(makePod(0, rand));
  return w;
}

// Loose peas from an earlier pod, at rest: the first frame is a picture.
export function strew(w, list) {
  for (const [x, z, r] of list) {
    w.peas.push(newPea(x, r, z, r, 0, 0, 0, w.rand, true));
  }
}

function newPea(x, y, z, r, vx, vy, vz, rand, asleep = false) {
  // Peas are not true spheres: a small squash, and a random turn.
  const q = randomQuat(rand);
  return {
    x, y, z, vx, vy, vz, r,
    wx: 0, wy: 0, wz: 0,
    q, sq: 0.94 + rand() * 0.05, hue: rand(),
    asleep, still: asleep ? 1 : 0, age: 0, lastHit: -1, hits: 0,
  };
}
function randomQuat(rand) {
  const u1 = rand(), u2 = rand() * TAU, u3 = rand() * TAU;
  const a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
  return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
}

/* ---------- squeeze ---------- */
// The pointer sets the dent; holding builds the pressure.
export function squeeze(w, on, u) {
  const pod = w.pod;
  if (u != null) pod.du = clamp(u, 0.12, 0.88);
  if (on && !pod.held && !pod.split) {
    // Each press gives a small kick, so quick taps add up.
    pod.press = Math.min(0.97, pod.press + 0.1);
    pod.pinchV += 7;
    w.events.push({ type: 'press', x: podX(pod, pod.du), p: pod.press });
  }
  pod.held = on;
}
export function podX(pod, u) { return pod.x0 + (u - 0.5) * POD.L * Math.cos(pod.yaw); }
// The pod's u under a table point.
export function uAt(pod, x) { return clamp(((x - pod.x0) / Math.cos(pod.yaw)) / POD.L + 0.5, 0.12, 0.88); }

function snap(w, pod) {
  pod.split = true;
  pod.held = false;
  pod.crackT = 0;
  pod.c0 = pod.du; pod.cL = pod.du; pod.cR = pod.du;
  const sp = w.spring;
  pod.spring = sp;
  const r = pod.rand;
  // The two valves differ a little, so the open is never a mirror.
  pod.open[0].v = (11 + 8 * sp) * (0.9 + r() * 0.2);
  pod.open[1].v = (11 + 8 * sp) * (0.9 + r() * 0.2);
  pod.open[0].k = 0.92 + r() * 0.16;
  pod.open[1].k = 0.92 + r() * 0.16;
  pod.twistV = 0; pod.curlV = 0;
  w.events.push({ type: 'snap', x: podX(pod, pod.du), sp });
  // A fine mist of juice leaves the seam at the crack.
  const n = Math.round(18 + 30 * sp);
  for (let i = 0; i < n; i++) {
    const u = clamp(pod.du + (r() - 0.5) * 0.22, 0.1, 0.9);
    const c = centre(pod, u, [0, 0, 0, 0]);
    const h = 2 * POD.R * profile(u);
    const side = r() < 0.5 ? -1 : 1, spd = 15 + r() * 50 * (0.5 + sp);
    w.drops.push({
      x: c[0], y: h, z: c[1],
      vx: (r() - 0.5) * 24, vy: 30 + r() * 70 * (0.6 + sp), vz: side * spd * 0.5,
      s: 0.02 + r() * 0.035, life: 0.35 + r() * 0.45, age: 0,
    });
  }
}

/* ---------- step ---------- */
export function step(w, dt) {
  if (dt <= 0) return;
  w.time += dt;
  // Small fixed steps keep the contacts firm.
  const n = Math.ceil(dt / (1 / 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) sub(w, h);
  panStep(w, dt);
}

function sub(w, h) {
  for (const pod of w.pods) podStep(w, pod, h);
  peaStep(w, h);
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.age += h;
    d.vy -= G * 0.5 * h;
    d.x += d.vx * h; d.y += d.vy * h; d.z += d.vz * h;
    if (d.y < 0.01) { d.y = 0.01; d.vx = d.vy = d.vz = 0; d.life = Math.min(d.life, d.age + 0.25); }
    if (d.age > d.life) w.drops.splice(i, 1);
  }
}

function podStep(w, pod, h) {
  // A new pod drops onto the table at the end of the pan.
  if (pod.drop > 0 || pod.dropV !== 0) {
    pod.dropV -= G * 0.6 * h;
    pod.drop += pod.dropV * h;
    if (pod.drop <= 0) {
      if (pod.dropV < -15) w.events.push({ type: 'land', x: pod.x0, v: -pod.dropV });
      pod.drop = 0;
      pod.dropV = pod.dropV < -15 ? -pod.dropV * 0.22 : 0;
      pod.pinchV -= 4;
    }
  }
  if (!pod.split) {
    // Pressure rises while held and leaks away when released.
    if (pod.held) pod.press += h / 0.95;
    else pod.press = Math.max(0, pod.press - h * 0.32);
    const target = pod.held ? 0.32 + 0.68 * Math.min(1, pod.press) : pod.press * 0.35;
    pod.pinchV += (380 * (target - pod.pinch) - 16 * pod.pinchV) * h;
    pod.pinch += pod.pinchV * h;
    if (pod.press >= 1 && w.pod === pod) snap(w, pod);
    return;
  }
  // Under reduced motion the open plays at half speed.
  if (w.calm) h *= 0.5;
  // The pinch lets go at the snap.
  pod.pinchV += (-300 * pod.pinch - 18 * pod.pinchV) * h;
  pod.pinch += pod.pinchV * h;
  pod.crackT += h;
  // The crack runs both ways along the seam in a few frames.
  const run = h * (55 + 40 * pod.spring) / POD.L;
  pod.cL = Math.max(-0.1, pod.cL - run);
  pod.cR = Math.min(1.1, pod.cR + run);
  const sp = pod.spring;
  // Each valve is a damped spring that rests on its back, open.
  // A fresh pod springs back to a narrow gape; a dry one lies flat open.
  const rest = 0.55 + 0.95 * sp * sp;
  for (let s = 0; s < 2; s++) {
    const o = pod.open[s];
    const k = 70 * o.k, c = 5.5 + 2 * (1 - sp);
    o.v += (k * (rest - o.a) - c * o.v) * h;
    o.a += o.v * h;
    // The back meets the table: the valve rocks back with a loss.
    // Flat on its back, the valve meets the table and rocks back.
    if (o.a > 1.55 && o.v > 0) {
      if (!pod.landed[s]) w.events.push({ type: 'valve', x: podX(pod, 0.5), side: s ? 1 : -1, v: o.v });
      pod.landed[s] = true;
      o.a = 1.55; o.v *= -0.3;
    }
    // A fresh valve turns back in the air at the top of its swing.
    if (!pod.landed[s] && o.v < 0) {
      pod.landed[s] = true;
      w.events.push({ type: 'valve', x: podX(pod, 0.5), side: s ? 1 : -1, v: 2 });
    }
  }
  // A dry pod twists as it opens; a fresh one barely does.
  const tw = w.calm ? 0 : (0.06 + 1.3 * sp * sp);
  pod.twistV += (60 * (tw - pod.twist) - 9 * pod.twistV) * h;
  pod.twist += pod.twistV * h;
  const cu = 0.12 + 0.55 * sp;
  pod.curlV += (40 * (cu - pod.curl) - 8 * pod.curlV) * h;
  pod.curl += pod.curlV * h;
  // Each pea leaves when the crack has passed it.
  for (const p of pod.peas) {
    if (p.out) continue;
    const passed = p.u < pod.c0 ? pod.cL < p.u : pod.cR > p.u;
    if (!passed) continue;
    p.at += h;
    if (p.at < 0.035 + p.hue * 0.06) continue;
    launch(w, pod, p);
  }
}

// A pea springs out to its own side, up and away.
function launch(w, pod, p) {
  p.out = true;
  const r = pod.rand, sp = pod.spring * (w.calm ? 0.4 : 1);
  const c = centre(pod, p.u, [0, 0, 0, 0]);
  const y = POD.R * profile(p.u) * 1.05 + pod.drop;
  const up = (40 + 70 * sp) * (0.75 + r() * 0.5);
  const side = (16 + 36 * sp) * (0.6 + r() * 0.7) * p.side;
  const along = (p.u - pod.c0) * (20 + 45 * sp) + (r() - 0.5) * 14;
  const ca = Math.cos(pod.yaw), sa = Math.sin(pod.yaw);
  const vx = along * ca + side * c[2], vz = along * sa + side * c[3];
  const pea = newPea(c[0], y, c[1], p.r, vx, up, vz, r);
  pea.q = p.q.slice();
  // A dry pod flings peas with spin.
  pea.wx = (r() - 0.5) * 40 * sp; pea.wy = (r() - 0.5) * 30; pea.wz = (r() - 0.5) * 40 * sp;
  pea.hue = p.hue;
  w.peas.push(pea);
  w.events.push({ type: 'launch', x: c[0], v: up });
}

/* ---------- peas ---------- */
const MU = 0.45, RR = 0.075, E_TABLE = 0.42, E_PEA = 0.55;
function peaStep(w, h) {
  const P = w.peas;
  for (const p of P) {
    if (p.asleep) continue;
    p.age += h;
    p.vy -= G * h;
    p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
    // Air drag is small at these speeds.
    const air = Math.exp(-0.15 * h);
    p.vx *= air; p.vz *= air;
    const ground = p.y <= p.r + 1e-4;
    if (ground) {
      p.y = p.r;
      if (p.vy < 0) {
        const vin = -p.vy;
        if (vin > 12) {
          w.events.push({ type: 'bounce', x: p.x, z: p.z, v: vin, r: p.r });
          p.vy = vin * E_TABLE * (0.85 + Math.random() * 0.3);
        } else p.vy = 0;
        // The impact grips: friction turns slip into spin at once.
        grip(p, Math.min(1, MU * (1 + 2 / 5 * 5) * vin / Math.max(1, slip(p))));
      }
      // Rolling contact: slip goes to roll, and rolling loses speed.
      grip(p, clamp(MU * G * h / Math.max(1e-3, slip(p))));
      const v = Math.hypot(p.vx, p.vz);
      if (v > 0) {
        // A pea is not round, so it stops sooner than a ball.
        const dec = (RR * G + 1.2 * v) * h;
        const k = Math.max(0, v - dec) / v;
        p.vx *= k; p.vz *= k;
        p.wx = p.vz / p.r; p.wz = -p.vx / p.r;
      }
      p.wy *= Math.exp(-4 * h);
    }
    // Spin turns the pea.
    turn(p.q, p.wx, p.wy, p.wz, h);
  }
  // Pea against pea: equal masses by volume, with a loss.
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    for (let j = i + 1; j < P.length; j++) {
      const b = P[j];
      if (a.asleep && b.asleep) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const rr = a.r + b.r, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-10) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d;
      const ma = a.r ** 3, mb = b.r ** 3, ia = 1 / ma, ib = 1 / mb, is = ia + ib;
      const pen = rr - d;
      a.x -= nx * pen * ia / is; a.y -= ny * pen * ia / is; a.z -= nz * pen * ia / is;
      b.x += nx * pen * ib / is; b.y += ny * pen * ib / is; b.z += nz * pen * ib / is;
      a.y = Math.max(a.y, a.r); b.y = Math.max(b.y, b.r);
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (vn >= 0) continue;
      const jn = -(1 + E_PEA) * vn / is;
      a.vx -= jn * nx * ia; a.vy -= jn * ny * ia; a.vz -= jn * nz * ia;
      b.vx += jn * nx * ib; b.vy += jn * ny * ib; b.vz += jn * nz * ib;
      if (a.asleep) wakePea(a);
      if (b.asleep) wakePea(b);
      if (-vn > 8) w.events.push({ type: 'click', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, v: -vn });
    }
  }
  // Open valves are low humps on the table: rolling peas bounce off.
  for (const pod of w.pods) if (pod.split) for (const p of P) hump(pod, p);
  // A pea at rest falls asleep.
  for (const p of P) {
    if (p.asleep) continue;
    const v = Math.hypot(p.vx, p.vy, p.vz);
    if (p.y <= p.r + 1e-3 && v < 1.2) p.still += h; else p.still = 0;
    if (p.still > 0.25) { p.asleep = true; p.vx = p.vy = p.vz = 0; p.wx = p.wy = p.wz = 0; }
  }
}
function wakePea(p) { p.asleep = false; p.still = 0; }

// The speed of the contact point against the table.
function slip(p) {
  const sx = p.vx - p.wz * p.r, sz = p.vz + p.wx * p.r;
  return Math.hypot(sx, sz);
}
// Moves the pea a share k of the way to pure rolling.
function grip(p, k) {
  if (k <= 0) return;
  // Pure roll of a solid ball: v = (5 v + 2 r w x n) / 7.
  const rx = (5 * p.vx + 2 * p.r * p.wz) / 7, rz = (5 * p.vz - 2 * p.r * p.wx) / 7;
  p.vx = lerp(p.vx, rx, k); p.vz = lerp(p.vz, rz, k);
  p.wx = lerp(p.wx, p.vz / p.r, k); p.wz = lerp(p.wz, -p.vx / p.r, k);
}
// Turns the quaternion q by the spin w over time h.
function turn(q, wx, wy, wz, h) {
  const a = Math.hypot(wx, wy, wz) * h;
  if (a < 1e-7) return;
  const s = Math.sin(a / 2) / (a / h), c = Math.cos(a / 2);
  const x = wx * s, y = wy * s, z = wz * s;
  const [qx, qy, qz, qw] = q;
  q[0] = c * qx + x * qw + y * qz - z * qy;
  q[1] = c * qy - x * qz + y * qw + z * qx;
  q[2] = c * qz + x * qy - y * qx + z * qw;
  q[3] = c * qw - x * qx - y * qy - z * qz;
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l;
}

// Each open valve lies on its back beside the seam: a capsule on the table.
const cTmp = [0, 0, 0, 0];
function hump(pod, p) {
  if (p.y > p.r + 0.9) return;
  const ca = Math.cos(pod.yaw), sa = Math.sin(pod.yaw);
  const lx = (p.x - pod.x0) * ca + p.z * sa, u = clamp(lx / POD.L + 0.5, 0.06, 0.94);
  const open = openAt(pod, u);
  if (open < 0.5) return;
  centre(pod, u, cTmp);
  const R = POD.R * profile(u);
  for (const s of [-1, 1]) {
    const cx = cTmp[0] + cTmp[2] * s * R * 1.35, cz = cTmp[1] + cTmp[3] * s * R * 1.35;
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    const rr = p.r + R * 0.7;
    if (d >= rr || d < 1e-6) continue;
    const nx = dx / d, nz = dz / d;
    p.x += nx * (rr - d); p.z += nz * (rr - d);
    const vn = p.vx * nx + p.vz * nz;
    if (vn < 0) {
      p.vx -= 1.5 * vn * nx; p.vz -= 1.5 * vn * nz;
      if (p.asleep) wakePea(p);
    }
  }
}

/* ---------- pan to the next pod ---------- */
export function busy(w) {
  if (w.pan || w.drops.length) return true;
  for (const p of w.peas) if (!p.asleep) return true;
  const pod = w.pod;
  if (pod.held || pod.press > 0.002 || Math.abs(pod.pinch) > 1e-3 || Math.abs(pod.pinchV) > 1e-3 || pod.drop > 0 || pod.dropV) return true;
  if (pod.split) return true;
  return false;
}

// True once the split pod and all its peas lie still.
export function settled(w) {
  const pod = w.pod;
  if (!pod.split || w.pan) return false;
  if (pod.peas.some(p => !p.out)) return false;
  if (w.drops.length) return false;
  for (const s of pod.open) if (Math.abs(s.v) > 0.03) return false;
  if (Math.abs(pod.twistV) > 0.02 || Math.abs(pod.curlV) > 0.02) return false;
  for (const p of w.peas) if (!p.asleep) return false;
  return true;
}

export function startPan(w, { cut = false } = {}) {
  if (w.pan) return;
  const from = w.pod.x0;
  const next = makePod(from + GAP, w.rand);
  next.spring = w.spring;
  w.pods.push(next);
  w.pan = { t: 0, dur: cut ? 0.5 : 1.7, from, to: from + GAP, cut, dropped: false };
  w.events.push({ type: 'pan', cut });
}

function panStep(w, dt) {
  const P = w.pan;
  if (!P) return;
  P.t += dt;
  const k = clamp(P.t / P.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  w.view = P.cut ? (k < 0.5 ? P.from : P.to) : lerp(P.from, P.to, e);
  // Late in the pan the new pod drops onto the table.
  if (!P.dropped && k > 0.62) {
    P.dropped = true;
    if (!P.cut && !w.calm) { w.pod.drop = 2.4; w.pod.dropV = 0; }
  }
  if (k >= 1) {
    w.pan = null;
    w.view = P.to;
    // The old pod and its peas are out of frame now.
    while (w.pods.length > 1) w.pods.shift();
    w.peas = w.peas.filter(p => p.x > P.to - GAP * 0.6);
  }
}
