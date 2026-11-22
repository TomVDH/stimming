// Wheat storm: one lightning channel, from the cloud base to the ground.
// The main channel wanders by midpoint displacement; branches fork down from it.

/**
 * Builds a channel.
 * @param {number} gx Strike point x, metres.
 * @param {number} gz Strike point z, metres.
 * @param {() => number} rnd A random source, 0 to 1.
 * @returns {{ segs: Float32Array, top: number[] }} 8 floats a segment: a, b, order, brightness.
 */
export function makeChannel(gx, gz, rnd) {
  const out = [];
  const top = [gx + (rnd() - 0.5) * 380, 780 + rnd() * 260, gz + 120 + rnd() * 340];
  const H = top[1], zMin = Math.max(4, gz * 0.6);
  // Midpoint displacement: each split kinks the path by a share of its length.
  const wander = (a, b, depth, rough) => {
    if (depth === 0) return [a, b];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    // Long spans kink less, so the channel keeps its general line.
    const big = depth >= 7 ? 0.25 : depth === 6 ? 0.6 : 1;
    // The path kinks mostly sideways; depth wanders less and never nears the eye.
    // Kinks scale with the drop, so a sideways run does not grow sideways.
    const lv = Math.abs(b[1] - a[1]) * 0.8 + l * 0.2;
    const m = [0, 1, 2].map(k => (a[k] + b[k]) / 2 + (rnd() - 0.5) * lv * rough * big * [1, 0.25, 0.5][k]);
    m[2] = Math.max(m[2], zMin);
    const left = wander(a, m, depth - 1, rough), right = wander(m, b, depth - 1, rough);
    return left.concat(right.slice(1));
  };
  const push = (pts, bright, fade) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      // Order: how far down the leader has come when this part lights.
      const order = 1 - Math.max(0, Math.min(a[1], b[1])) / H;
      out.push(a[0], a[1], a[2], b[0], b[1], b[2], order, bright * (1 - fade * i / pts.length));
    }
  };
  const main = wander(top, [gx, 0, gz], 8, 0.36);
  push(main, 1, 0);
  // Branches fork from the upper two thirds and reach down and out.
  const nb = 3 + Math.floor(rnd() * 4);
  for (let j = 0; j < nb; j++) {
    const i = Math.floor((0.05 + rnd() * 0.6) * main.length);
    const a = main[i];
    const reach = a[1] * (0.18 + rnd() * 0.35), ang = rnd() * Math.PI * 2;
    const b = [a[0] + Math.cos(ang) * reach * 0.8, a[1] - reach, a[2] + Math.sin(ang) * reach * 0.8];
    const br = wander(a, b, 6, 0.5);
    push(br, 0.6, 0.85);
    // One branch in two forks again.
    if (rnd() < 0.5) {
      const k = Math.floor(br.length * (0.3 + rnd() * 0.4)), c = br[k], r2 = reach * 0.4;
      const ang2 = ang + (rnd() - 0.5) * 2;
      push(wander(c, [c[0] + Math.cos(ang2) * r2, c[1] - r2, c[2] + Math.sin(ang2) * r2], 5, 0.5), 0.35, 0.9);
    }
  }
  return { segs: new Float32Array(out), top };
}
