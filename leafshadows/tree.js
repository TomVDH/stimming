// Leaf shadows: the tree out of view, as leaves and sticks in wall space.
// Units are metres on the wall. x runs right, y runs up, the origin is the view's centre.
// Four layers by distance from the wall: two in the crown, a mid branch, a near sprig.

// The sun: 28 degrees up, 58 degrees left of the wall's normal.
const AZ = 58 * Math.PI / 180, EL = 28 * Math.PI / 180;
export const SUN = [-Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
// The sun's angular radius in radians.
const SUN_R = 0.00465;
// Light runs down and to the right on the wall; a dapple stretches along it.
const flat = Math.hypot(SUN[0], SUN[1]);
export const SLANT = [-SUN[0] / flat, -SUN[1] / flat];

// d: metres from the wall. scale: the mask's size against the canvas.
export const LAYERS = [
  { d: 5.5, scale: 0.25, taps: 64 },
  { d: 3.6, scale: 0.25, taps: 48 },
  { d: 1.3, scale: 0.5, taps: 32 },
  { d: 0.55, scale: 1, taps: 0 },
];
// The sun's disc on the wall from distance d: minor and major radii in metres.
export const discAt = d => { const r = d * SUN_R / SUN[2]; return [r, r / SUN[2]]; };

// Leaf through-light: about a tenth of the sun, yellow-green.
export const LEAF_TAU = [0.11, 0.15, 0.035];

/* ---------- random ---------- */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const fract = x => x - Math.floor(x);
function h2(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
export function vn2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy) + (h2(ix + 1, iy) - h2(ix, iy)) * fx;
  const b = h2(ix, iy + 1) + (h2(ix + 1, iy + 1) - h2(ix, iy + 1)) * fx;
  return a + (b - a) * fy;
}

/* ---------- the tree ---------- */
// One instance: three vec4s.
// A: x, y, length, angle. B: twig pivot x, y, branch, seed. C: kind, width, bend, flutter.
// Kind 0 is a leaf; kind 1 is a stick, its width the base half-thickness, its bend the tip's.
export function growTree(seed = 7) {
  const rnd = rng(seed);
  const branches = [];
  const layers = LAYERS.map(() => []);
  const branch = (layer, px, py, o) => {
    branches.push({ layer, px, py, w: o.w, z: o.z ?? 0.12, lean: o.lean, gain: o.gain ?? 1, th: 0, v: 0, amp: 0, seed: rnd() });
    return branches.length - 1;
  };
  const leaf = (L, x, y, len, ang, tx, ty, b, o = {}) => layers[L].push([
    x, y, len, ang, tx, ty, b, rnd(),
    0, o.wr ?? 0.5 + 0.12 * rnd(), (rnd() - 0.5) * 0.18, o.flutter ?? 1,
  ]);
  // A stick with sway 0 is a main stem; a shoot's stem bobs with its leaves.
  const stick = (L, x, y, len, ang, tx, ty, b, t0, t1, sway = 0) => layers[L].push([
    x, y, len, ang, tx, ty, b, rnd(), 1, t0, t1, sway,
  ]);
  // A shoot: a stem with leaves on alternate sides, then one at the tip.
  function shoot(L, x, y, dir, len, b, { leafLen = 0.075, stem = 0.0015, gap = 0.05, wr } = {}) {
    if (stem > 0) stick(L, x, y, len, dir, x, y, b, stem, stem * 0.6, 1);
    let side = rnd() < 0.5 ? 1 : -1;
    for (let s = len * (0.25 + 0.15 * rnd()); s < len; s += gap * (0.8 + 0.4 * rnd())) {
      const k = s / len;
      const px = x + Math.cos(dir) * s, py = y + Math.sin(dir) * s;
      // Leaves grow larger toward the middle of the shoot.
      const l = leafLen * (0.7 + 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.1))) * (0.85 + 0.3 * rnd());
      leaf(L, px, py, l, dir + side * (0.6 + 0.5 * rnd()), x, y, b, { wr: wr && wr + 0.1 * rnd() });
      side = -side;
    }
    leaf(L, x + Math.cos(dir) * len, y + Math.sin(dir) * len, leafLen * (0.8 + 0.3 * rnd()), dir + (rnd() - 0.5) * 0.4, x, y, b);
  }

  // The crown shades the upper left; the sun falls open to the lower right.
  const dens = (x, y) => 0.78 - 0.34 * x + 0.42 * y + 0.7 * (vn2(x * 1.3 + 3, y * 1.3 + 7) - 0.5);
  // Leaves grow in rosettes at the twig tips; the gaps between rosettes are the pinholes.
  const crown = (L, pivots, { space, radius, leafLen }) => {
    const ids = pivots.map(([px, py, w, lean]) => branch(L, px, py, { w, lean }));
    // One limb: a soft dark band, partly hidden in the leaves.
    {
      let x = -1.9 + rnd() * 0.5, y = 0.5 + rnd() * 0.8, a = -0.15 - rnd() * 0.35, t = 0.04;
      const b = ids[0];
      for (let k = 0; k < 3; k++) {
        const l = 0.35 + rnd() * 0.25;
        stick(L, x, y, l, a, x, y, b, t, t * 0.78);
        x += Math.cos(a) * l; y += Math.sin(a) * l; a += (rnd() - 0.5) * 0.6; t *= 0.78;
      }
    }
    for (let gy = -1.9; gy < 1.9; gy += space) for (let gx = -2.2; gx < 2.2; gx += space) {
      const x = gx + (rnd() - 0.5) * space * 0.9, y = gy + (rnd() - 0.5) * space * 0.9;
      const d = dens(x, y);
      if (rnd() > d) continue;
      // Thin crown makes small rosettes; thick crown makes full ones.
      const r = radius * (0.55 + 0.55 * Math.min(1, d)) * (0.75 + 0.5 * rnd());
      let b = ids[0], best = 1e9;
      for (const id of ids) { const e = Math.abs(branches[id].px - x) + rnd() * 0.5; if (e < best) { best = e; b = id; } }
      const n = 6 + Math.floor(rnd() * 4), a0 = rnd() * 6.28;
      for (let k = 0; k < n; k++) {
        const dir = a0 + k * 6.28 / n + (rnd() - 0.5) * 0.7;
        shoot(L, x, y, dir, r * (0.7 + 0.4 * rnd()), b, { leafLen, stem: 0, gap: leafLen * 0.32, wr: 0.62 });
      }
    }
  };
  // Crown pivots hang above the frame: [x, y, angular frequency, lean per unit wind].
  crown(0, [[-2.4, 2.6, 2.1, 0.022], [-1.5, 3.0, 1.8, 0.02], [-0.6, 2.8, 2.3, 0.024], [0.3, 3.1, 1.9, 0.02], [1.2, 2.7, 2.2, 0.023], [2.1, 3.0, 2.0, 0.021]], { space: 0.3, radius: 0.16, leafLen: 0.085 });
  crown(1, [[-2.2, 2.2, 2.6, 0.03], [-1.0, 2.4, 2.4, 0.028], [0.2, 2.3, 2.8, 0.032], [1.4, 2.1, 2.5, 0.03]], { space: 0.26, radius: 0.12, leafLen: 0.075 });

  // The mid branch reaches in from the left, low in the frame.
  {
    const b = branch(2, -2.1, -0.3, { w: 3.1, lean: 0.035, gain: 1.1 });
    let x = -1.55, y = -0.32, a = -0.05, t = 0.011;
    for (let k = 0; k < 5; k++) {
      const l = 0.22 + rnd() * 0.05;
      stick(2, x, y, l, a, x, y, b, t, t * 0.85);
      // Side shoots up and down.
      for (let j = 0; j < 2; j++) {
        const s = l * (0.3 + 0.5 * j + 0.1 * rnd());
        const sx = x + Math.cos(a) * s, sy = y + Math.sin(a) * s;
        const side = (k + j) % 2 ? 1 : -1;
        shoot(2, sx, sy, a + side * (0.6 + 0.5 * rnd()), 0.16 + rnd() * 0.1, b, { leafLen: 0.11, stem: 0.0025, gap: 0.055 });
      }
      x += Math.cos(a) * l; y += Math.sin(a) * l; a += (rnd() - 0.4) * 0.3; t *= 0.85;
    }
    shoot(2, x, y, a, 0.18, b, { leafLen: 0.115, stem: 0.0025 });
  }

  // The near sprig hangs in from the upper right, into the open sun: crisp shadows.
  {
    const b = branch(3, 1.6, 1.25, { w: 3.8, lean: 0.05, gain: 1.3 });
    let x = 1.25, y = 0.95, a = -2.35, t = 0.0045;
    for (let k = 0; k < 6; k++) {
      const l = 0.17 + rnd() * 0.04;
      stick(3, x, y, l, a, x, y, b, t, t * 0.87);
      const side = k % 2 ? 1 : -1;
      const s = l * 0.55, sx = x + Math.cos(a) * s, sy = y + Math.sin(a) * s;
      leaf(3, sx, sy, 0.1 + 0.025 * rnd(), a + side * (0.75 + 0.3 * rnd()), sx, sy, b, { flutter: 0.8 });
      if (k === 2 || k === 4) shoot(3, sx, sy, a - side * 0.85, 0.16, b, { leafLen: 0.1, stem: 0.0018, gap: 0.06 });
      x += Math.cos(a) * l; y += Math.sin(a) * l; a -= 0.07 + (rnd() - 0.5) * 0.14; t *= 0.87;
    }
    leaf(3, x, y, 0.12, a, x, y, b, { flutter: 0.8 });
  }

  return {
    branches,
    layers: layers.map(list => {
      const A = new Float32Array(list.length * 12);
      list.forEach((r, i) => A.set(r, i * 12));
      return { data: A, count: list.length };
    }),
  };
}

/* ---------- the wind ---------- */
// The gust field along x at time phase g, 0 to 1. Gusts run left to right.
export function gustAt(x, g) {
  const a = x * 0.35 - g;
  return 0.6 * vn2(a, 1.7) + 0.4 * vn2(a * 2.3 + 11, 5.3);
}
// The wind on a branch at x, from the breeze and any gust front in flight.
export function windAt(x, breeze, g, fronts) {
  const k = gustAt(x, g);
  // A stronger breeze is also gustier.
  let w = breeze * (0.35 + 1.4 * Math.pow(k, 2.2 - 1.2 * breeze));
  for (const f of fronts) {
    const u = x - f.x;
    // A sharp leading edge and a long tail behind it.
    w += f.a * (u > 0 ? Math.exp(-((u / 0.35) ** 2)) : Math.exp(u / 1.6));
  }
  return w;
}
