// Milk crown timeline: every shape as a function of event time.
// Event time is in ms after impact; lengths are in mm.
// The shader reads the uniforms; the page reads the sound cues.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// Gravity in mm per ms squared.
export const G = 0.00981;
// The beads fall faster: drag and a stronger pull keep the shot clean.
export const GB = 4.5 * G;
// The drop radius.
export const A = 2.0;
// The most points the shader holds.
export const NMAX = 32;
// The pinch-off of the jet droplet.
export const T_PINCH = 29;

// A small seeded random source, so a replay is the same drop.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// One drop from a height in cm. The seed fixes the jitter of the points.
export function makeEvent(heightCm, seed = 1) {
  const r = rng(seed * 2654435761);
  // Impact speed in mm per ms (equal to m/s), from the fall height.
  const U = Math.sqrt(2 * 9.81 * heightCm / 100);
  // The scale against the default drop: 2.6 m/s.
  const s = U / 2.6;
  const N = Math.round(clamp(13 + 11 * s, 14, NMAX));
  // Points pinch off only past a splash threshold.
  const pinchOdds = sstep(0.5, 0.8, s);
  const fing = new Float32Array(NMAX * 4);
  const beads = [];
  for (let i = 0; i < NMAX; i++) {
    const jit = (r() - 0.5) * 0.22;
    const len = 0.75 + 0.5 * r();
    const size = 0.8 + 0.4 * r();
    const td = r() < pinchOdds ? 8.8 + 3.4 * r() : 1e4;
    fing.set([jit, td, size, len], i * 4);
    // Bead speed at pinch-off: out and up, in mm per ms.
    const vo = (0.07 + 0.06 * s) * (0.8 + 0.4 * r());
    const vu = (0.1 + 0.08 * s) * (0.8 + 0.4 * r());
    beads.push({ td, vo, vu });
  }
  const ev = {
    U, s, N, seed, heightCm, fing, beads,
    // The play starts with the drop above the frame.
    t0: -30 / U,
    // The jet droplet: launch speed and its return.
    jet: null,
    tLand: 0,
    tEnd: 0,
  };
  // The jet: its top height and the droplet's flight.
  ev.Jmax = 11 * Math.pow(s, 1.1);
  ev.rj = 1.05 * Math.pow(s, 0.3);
  const jetTop = t => ev.Jmax * Math.sin(Math.PI / 2 * clamp((t - 19) / 14));
  ev.jetTop = jetTop;
  const y0 = jetTop(T_PINCH) - ev.rj;
  const v0 = (jetTop(T_PINCH + 0.1) - jetTop(T_PINCH - 0.1)) / 0.2 * 0.62;
  ev.jet = { y0, v0 };
  // The droplet lands back on the pool: y0 + v0 t - g t^2 / 2 = rj.
  const disc = v0 * v0 + 2 * G * (y0 - ev.rj);
  ev.tLand = T_PINCH + (v0 + Math.sqrt(Math.max(0, disc))) / G;
  ev.tEnd = ev.tLand + 95;
  // Each bead's launch point, from the crown at its pinch-off.
  ev.bead = new Float32Array(NMAX * 4);
  const u = makeUniforms();
  const dir = [0.62 / Math.hypot(0.62, 1), 1 / Math.hypot(0.62, 1)];
  for (let i = 0; i < NMAX; i++) {
    const td = fing[i * 4 + 1];
    if (td > 100) continue;
    frameAt(ev, td, u);
    const [Rb, H, lean] = u.crown;
    const Rt = Rb + lean * H * 0.55 + (lean + 0.3) * H * 0.45;
    const L = u.rim[1] * fing[i * 4 + 3];
    const rb = (0.36 + 0.12 * s) * fing[i * 4 + 2] * sstep(3, 8, td);
    const k = L + rb * 1.3;
    ev.bead.set([Rt + dir[0] * k, H + dir[1] * k, beads[i].vo, beads[i].vu], i * 4);
  }
  return ev;
}

// The crown height factor: rise to the peak at 8 ms, fall back by 21 ms.
function crownF(t) {
  if (t <= 0) return 0;
  if (t < 8) return 1 - Math.pow(1 - t / 8, 2.2);
  if (t < 21) return 1 - Math.pow((t - 8) / 13, 1.6);
  return 0;
}

// The uniforms at event time t. Writes into u and returns it.
export function frameAt(ev, t, u) {
  const { U, s } = ev;
  // The falling drop: centre y and radius, then it sinks and merges.
  const dropY = A - U * t;
  const sink = sstep(0, 1.7 * A / U, t);
  const wob = t < 0 ? 0.05 * Math.sin(t * 0.55) : 0;
  u.drop[0] = 0; u.drop[1] = dropY; u.drop[2] = wob; u.drop[3] = t < 1.7 * A / U ? A * (1 - 0.75 * sink) : 0;
  // Crown base radius: a square-root spread that slows to a stop.
  const T = Math.max(0, t) * U / A;
  const Te = 20 * (1 - Math.exp(-T / 20));
  const Rb = A * (0.9 + 1.05 * Math.sqrt(Te));
  const f = crownF(t);
  const H = 5.4 * Math.pow(s, 0.9) * f;
  // Collapse runs 0 to 1 after the peak.
  const fall = sstep(8, 21, t);
  u.crown[0] = Rb; u.crown[1] = H; u.crown[2] = 0.3 + 0.08 * s; u.crown[3] = (0.09 + 0.05 * s) * (1 + 1.6 * fall);
  // Rim tube radius, finger growth, point count, event time.
  const grow = sstep(2.0, 9.5, t) * (1 - sstep(11, 18, t));
  u.rim[0] = (0.2 + 0.12 * sstep(1, 8, t)) * (1 + 0.8 * fall) * Math.pow(s, 0.3);
  u.rim[1] = 1.5 * Math.pow(s, 0.9) * grow;
  u.rim[2] = ev.N;
  u.rim[3] = t;
  // The crater: depth and radius. It opens under the drop, fills from 12 ms.
  const open = t > 0 ? 1 - Math.exp(-t / 2.2) : 0;
  const fill = sstep(11, 22, t);
  u.pool[0] = 3.0 * Math.pow(s, 0.8) * open * (1 - fill);
  u.pool[1] = Math.max(A, 0.85 * Rb);
  // The swell at the crown's foot, and its width.
  u.pool[2] = 0.9 * s * open * (1 - sstep(14, 30, t));
  u.pool[3] = 1.1 + 0.15 * t * (t > 0 ? 1 : 0);
  // The jet: top height, base radius, neck radius, bulb radius.
  const jt = ev.jetTop(t);
  const rise = sstep(19, 21, t);
  let top = jt, neck = 0.62 * Math.pow(s, 0.3) * (1 - sstep(T_PINCH - 3.2, T_PINCH, t)) + 0.04;
  if (t > T_PINCH) {
    // The column falls back after the pinch.
    const k = clamp((t - T_PINCH) / 24);
    top = ev.jetTop(T_PINCH) * (1 - 0.35 * Math.min(1, (t - T_PINCH) / 3)) * (1 - Math.pow(k, 1.3));
    neck = 0.55 * Math.pow(s, 0.3) * (1 - k);
  }
  u.jet[0] = t > 19 && t < T_PINCH + 24 ? top : 0;
  u.jet[1] = (2.4 * Math.pow(s, 0.3)) * rise;
  u.jet[2] = neck;
  u.jet[3] = t < T_PINCH ? ev.rj * sstep(21, 26, t) : 0.7 * ev.rj * (1 - clamp((t - T_PINCH) / 20));
  // The droplet after the pinch: centre y, radius, wobble.
  if (t > T_PINCH && t < ev.tLand) {
    const d = t - T_PINCH;
    u.jdrop[0] = ev.jet.y0 + ev.jet.v0 * d - 0.5 * G * d * d;
    u.jdrop[1] = ev.rj;
    u.jdrop[2] = 0.12 * Math.exp(-d / 12) * Math.sin(d * 0.9);
  } else {
    u.jdrop[1] = t >= ev.tLand && t < ev.tLand + 2.5 ? ev.rj * (1 - sstep(ev.tLand, ev.tLand + 2.5, t)) : 0;
    u.jdrop[0] = t >= ev.tLand ? ev.rj - (t - ev.tLand) * 0.9 : 0;
  }
  // Ring packets: impact, collapse, return; ages in ms.
  u.rings[0] = t;
  u.rings[1] = t - 17;
  u.rings[2] = t - ev.tLand;
  u.rings[3] = s;
  return u;
}

// A fresh uniform holder.
export function makeUniforms() {
  return {
    drop: new Float32Array(4), crown: new Float32Array(4), rim: new Float32Array(4),
    pool: new Float32Array(4), jet: new Float32Array(4), jdrop: new Float32Array(4), rings: new Float32Array(4),
  };
}

// Sound cues between two event times, in order: [time, kind, value].
export function cuesBetween(ev, a, b) {
  const out = [];
  const hit = (t, kind, v = 0) => { if (t > a && t <= b) out.push([t, kind, v]); };
  hit(0, 'impact', ev.s);
  hit(3, 'crown', ev.s);
  for (let i = 0; i < ev.N; i++) {
    const bd = ev.beads[i];
    if (bd.td > 100) continue;
    hit(bd.td, 'bead', i / ev.N);
    // The bead falls back to the pool after its flight.
    const tf = (bd.vu + Math.sqrt(bd.vu * bd.vu + 2 * GB * 8)) / GB;
    hit(bd.td + tf, 'beadland', i / ev.N);
  }
  hit(19, 'jet', ev.s);
  hit(T_PINCH, 'pinch', ev.s);
  hit(ev.tLand, 'land', ev.s);
  out.sort((x, y) => x[0] - y[0]);
  return out;
}
