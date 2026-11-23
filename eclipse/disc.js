// Desert eclipse: the sun and moon discs, in sun radii.
// The moon's limb has valleys; light through them makes Baily's beads.
// shaders.js holds the same limb in GLSL; keep the two in step.

// The moon is 8% larger than the sun, as near perigee.
export const K = 1.08;
// Valley depth as a share of the moon's radius, drawn about 15 times true.
export const VAL = 0.022;

/** @param {number} phi */
export function valley(phi) {
  const s = Math.sin(7 * phi + 0.2) * 0.35 + Math.sin(13 * phi + 1.3) * 0.5 + Math.sin(29 * phi + 0.4) * 0.3
    + Math.sin(47 * phi + 2.1) * 0.2 + Math.sin(83 * phi + 5.0) * 0.15;
  const v = Math.min(1, Math.max(0, 0.5 + 0.38 * s));
  return v * v * v;
}
/** The moon's limb radius at an angle. @param {number} phi */
export const limbR = phi => K * (1 - VAL * valley(phi));

// A polar grid on the sun's disc, dense at the limb.
const NT = 720, NR = 40;
const pts = new Float32Array(NT * NR * 3);
{
  let i = 0, sum = 0;
  const edges = Array.from({ length: NR + 1 }, (_, j) => 1 - (j / NR) ** 2);
  for (let a = 0; a < NT; a++) {
    const th = (a + 0.5) / NT * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < NR; j++) {
      const r0 = edges[j + 1], r1 = edges[j], r = (r0 + r1) / 2;
      // Limb darkening: the edge shows 40% of the centre.
      const w = r * (r1 - r0) * (1 - 0.6 * (1 - Math.sqrt(Math.max(0, 1 - r * r))));
      pts[i++] = r * c; pts[i++] = r * s; pts[i++] = w;
      sum += w;
    }
  }
  for (let k = 2; k < pts.length; k += 3) pts[k] /= sum;
}
const bins = new Float32Array(NT);

/**
 * The share of sunlight that passes the moon, and where it comes from.
 * @param {number} dx  Moon offset east of the sun, in sun radii.
 * @param {number} dy  Moon offset up from the sun, in sun radii.
 * @returns {{ F: number, cx: number, cy: number, bx: number, by: number, bead: number }}
 *   F: visible share. cx, cy: light centre. bx, by: brightest limb spot. bead: its share of F.
 */
export function flux(dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (dist >= 1 + K) return { F: 1, cx: 0, cy: 0, bx: 0, by: 0, bead: 0 };
  const rIn = K * (1 - VAL), rIn2 = rIn * rIn, rOut2 = K * K;
  let F = 0, cx = 0, cy = 0;
  bins.fill(0);
  for (let i = 0, a = 0; a < NT; a++) {
    for (let j = 0; j < NR; j++, i += 3) {
      const x = pts[i], y = pts[i + 1], w = pts[i + 2];
      const mx = x - dx, my = y - dy, m2 = mx * mx + my * my;
      if (m2 < rIn2) continue;
      if (m2 < rOut2) {
        const lr = limbR(Math.atan2(my, mx));
        if (m2 < lr * lr) continue;
      }
      F += w; cx += x * w; cy += y * w;
      bins[a] += w;
    }
  }
  if (F <= 0) return { F: 0, cx: 0, cy: 0, bx: 0, by: 0, bead: 0 };
  // The brightest stretch of limb, over 15 degrees.
  let best = 0, at = 0;
  for (let a = 0; a < NT; a += 2) {
    let s = 0;
    for (let k = -15; k <= 15; k++) s += bins[(a + k + NT) % NT];
    if (s > best) { best = s; at = a; }
  }
  const th = (at + 0.5) / NT * Math.PI * 2;
  return { F, cx: cx / F, cy: cy / F, bx: Math.cos(th), by: Math.sin(th), bead: best / F };
}
