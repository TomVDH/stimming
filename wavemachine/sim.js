// Wave machine: the sim. A discrete torsion chain, no three.js.
// Rod 0 is the near end and turns free. The clamp holds the last rod.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Sizes in metres; angles in radians.
export const M = {
  n: 96,           // rods, the clamped one included
  gap: 0.018,      // rod spacing along the wire
  len: 0.46,       // rod length, end to end
  rod: 0.0022,     // rod radius
  wireY: 0.25,     // wire height over the bench
  maxTurn: 1.2,    // the hand turns a rod no further
};
const SUB = 1 / 360;          // sub-step; the top mode turns 0.33 rad per step
const GAMMA = 2 / 11;         // spin damping: amplitude time constant 11 s
const NU = 1.2;               // grid damping on the spin's Laplacian
const FLICK = 0.34;           // a flick lasts this long, in seconds

// Speed in rods per second for the weights slider, 0 to 1.
export const speedOf = w => 40 * Math.sqrt(2.1 / (1 + 2.2 * w));

export function makeLine() {
  const n = M.n;
  return {
    th: new Float64Array(n), w: new Float64Array(n), lap: new Float64Array(n),
    s: speedOf(0.5),
    hand: null,              // { i, target, off }
    drive: [],               // flicks in progress: { i, t, a, base }
    still: 0,                // hush strength from Still, eases out
    calm: false,
    events: [],
    clampPeak: 0, clampArmed: true,
    acc: 0, tail: 1,
  };
}

export function setWeights(L, w) { L.s = speedOf(clamp(w)); }

// A held rod follows the hand. Off is the grip side: 0 or pi.
export function grab(L, i, ang) {
  if (i >= M.n - 1) return;
  L.drive = L.drive.filter(d => d.i !== i);
  L.hand = { i, target: L.th[i], off: L.th[i] - ang };
  L.events.push({ type: 'grab', i });
}
export function moveHand(L, ang) {
  const h = L.hand;
  if (!h) return;
  // Unwrap the pointer angle near the rod's own angle.
  let t = ang + h.off;
  while (t - L.th[h.i] > Math.PI) t -= 2 * Math.PI;
  while (t - L.th[h.i] < -Math.PI) t += 2 * Math.PI;
  h.target = clamp(t, -M.maxTurn, M.maxTurn);
}
export function letGo(L) {
  const h = L.hand;
  if (!h) return;
  L.events.push({ type: 'release', i: h.i, spin: L.w[h.i] });
  L.hand = null;
}

// A flick: the rod swings out and back once.
export function flick(L, i, a) {
  if (i >= M.n - 1) return;
  if (L.hand?.i === i) L.hand = null;
  L.drive = L.drive.filter(d => d.i !== i);
  L.drive.push({ i, t: 0, a: a * (L.calm ? 0.6 : 1), base: L.th[i] });
  L.events.push({ type: 'flick', i, a });
}

// Still: a hand along the line damps it fast for a moment.
export function still(L) {
  L.still = 1;
  L.drive.length = 0;
  L.events.push({ type: 'still' });
}

function sub(L, dt) {
  const { th, w, lap } = L, n = M.n, last = n - 1;
  const k = L.s * L.s;            // stiffness over inertia, per rod squared
  const g = GAMMA * L.tail + 9 * L.still;
  // Laplacian of spin: damps only the grid-scale ripple.
  for (let i = 0; i < last; i++) {
    const a = i > 0 ? w[i - 1] : w[i];
    lap[i] = a - 2 * w[i] + w[i + 1];
  }
  for (let i = 0; i < last; i++) {
    // The near end has one neighbour: a free end.
    const left = i > 0 ? th[i - 1] - th[i] : 0;
    const tq = k * (left + th[i + 1] - th[i]);
    w[i] += (tq - g * w[i] + NU * lap[i]) * dt;
  }
  for (let i = 0; i < last; i++) th[i] += w[i] * dt;
  th[last] = 0; w[last] = 0;

  // Driven rods: a flick goes out and back on a smooth bump.
  for (let j = L.drive.length - 1; j >= 0; j--) {
    const d = L.drive[j];
    d.t += dt;
    const u = d.t / FLICK;
    if (u >= 1) {
      th[d.i] = d.base;
      w[d.i] = 0;
      L.drive.splice(j, 1);
      continue;
    }
    const sn = Math.sin(Math.PI * u);
    th[d.i] = d.base + d.a * sn * sn;
    w[d.i] = d.a * Math.PI / FLICK * Math.sin(2 * Math.PI * u);
  }
  const h = L.hand;
  if (h) {
    // A stiff, damped follow takes the jitter out of the pointer.
    const prev = th[h.i];
    const next = prev + (h.target - prev) * (1 - Math.exp(-dt / 0.018));
    th[h.i] = next;
    w[h.i] = (next - prev) / dt;
  }
}

// One frame of the line. Returns true while anything moves.
export function step(L, dt) {
  L.acc += dt;
  let steps = 0;
  while (L.acc >= SUB && steps < 40) { sub(L, SUB); L.acc -= SUB; steps++; }
  if (steps === 40) L.acc = 0;
  L.still = Math.max(0, L.still - dt / 0.9);
  // A small wave dies faster, so the line comes to rest in good time.
  let top = 0;
  for (let i = 0; i < M.n; i++) top = Math.max(top, Math.abs(L.th[i]));
  const u = clamp((0.04 - top) / 0.035);
  L.tail = 1 + 4 * u * u * (3 - 2 * u);

  // The clamp knocks when a strong pulse arrives there.
  const tq = Math.abs(L.th[M.n - 2]);
  if (L.clampArmed && tq > 0.06 && tq < L.clampPeak) {
    L.events.push({ type: 'clamp', a: L.clampPeak });
    L.clampArmed = false;
  }
  L.clampPeak = tq;
  if (tq < 0.02) L.clampArmed = true;

  if (!busy(L)) { L.th.fill(0); L.w.fill(0); }
  return busy(L);
}

export function energy(L) {
  const { th, w } = L, k = L.s * L.s;
  let e = 0;
  for (let i = 0; i < M.n - 1; i++) {
    const d = th[i + 1] - th[i];
    e += 0.5 * w[i] * w[i] + 0.5 * k * d * d;
  }
  return e;
}

export function busy(L) {
  if (L.hand || L.drive.length) return true;
  const { th, w } = L;
  for (let i = 0; i < M.n; i++) if (Math.abs(th[i]) > 0.0015 || Math.abs(w[i]) > 0.012) return true;
  return false;
}

// Spin-weighted centre of motion, 0 to 1 along the line.
export function centre(L) {
  let s = 0, sx = 0;
  for (let i = 0; i < M.n; i++) { const e = L.w[i] * L.w[i]; s += e; sx += e * i; }
  return s > 1e-9 ? sx / s / (M.n - 1) : 0.5;
}
