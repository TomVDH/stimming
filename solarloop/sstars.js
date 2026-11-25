// Star catalog: the S stars on their true orbits round Sagittarius A* (Tom, 2026-11-24).
// The elements are published fits; the toy keeps each orbit's true shape and timing.
// The sizes are not to scale (Tom: "lets try not to scale"): see SCALE below.
// A 2D canvas over the stage draws them; no GL pass, no volume work.

// Sources:
// G17: Gillessen et al. 2017, ApJ 837, 30, table 3 (arXiv:1611.09144).
// P20: Peißker et al. 2020, ApJ 899, 50, table 1 (arXiv:2008.04764).
// P22: Peißker et al. 2022, ApJ 933, 49, table 2, max. likelihood (arXiv:2207.02142).
// GR22: GRAVITY Collaboration 2022, A&A 657, L12, table 1 (arXiv:2112.07478).
// a in arcsec (G17, GR22) or mpc (P20, P22); angles in degrees; tp in years.
// sp: e early type (hot, blue white), l late type (cool, orange), u unknown.
const ELEMENTS = [
  // name, a, unit, e, i, Omega, omega, tp, mK, sp, source
  ['S1', 0.595, '"', 0.556, 119.14, 342.04, 122.3, 2001.80, 14.7, 'e', 'G17'],
  ['S2', 0.12495, '"', 0.88441, 134.70, 228.19, 66.25, 2018.3789, 13.95, 'e', 'GR22'],
  ['S4', 0.3570, '"', 0.3905, 80.33, 258.84, 290.8, 1957.4, 14.4, 'e', 'G17'],
  ['S8', 0.4047, '"', 0.8031, 74.37, 315.43, 346.70, 1983.64, 14.5, 'e', 'G17'],
  ['S9', 0.2724, '"', 0.644, 82.41, 156.60, 150.6, 1976.71, 15.1, 'e', 'G17'],
  ['S12', 0.2987, '"', 0.8883, 33.56, 230.1, 317.9, 1995.59, 15.5, 'e', 'G17'],
  ['S13', 0.2641, '"', 0.4250, 24.70, 74.5, 245.2, 2004.86, 15.8, 'e', 'G17'],
  ['S14', 0.2863, '"', 0.9761, 100.59, 226.38, 334.59, 2000.12, 15.7, 'e', 'G17'],
  ['S17', 0.3559, '"', 0.397, 96.83, 191.62, 326.0, 1991.19, 15.3, 'l', 'G17'],
  ['S18', 0.2379, '"', 0.471, 110.67, 49.11, 349.46, 1993.86, 16.7, 'e', 'G17'],
  ['S21', 0.2190, '"', 0.764, 58.8, 259.64, 166.4, 2027.40, 16.9, 'l', 'G17'],
  ['S29', 0.3975, '"', 0.9693, 144.37, 7.00, 205.79, 2021.4104, 16.7, 'e', 'GR22'],
  ['S31', 0.449, '"', 0.5497, 109.03, 137.16, 308.0, 2018.07, 15.7, 'e', 'G17'],
  ['S38', 0.14254, '"', 0.8145, 166.65, 109.45, 27.17, 2022.7044, 17.0, 'l', 'GR22'],
  ['S39', 0.370, '"', 0.9236, 89.36, 159.03, 23.3, 2000.06, 16.8, 'u', 'G17'],
  ['S55', 0.10440, '"', 0.7267, 158.52, 314.94, 322.78, 2021.6940, 17.5, 'u', 'GR22'],
  ['S60', 0.3877, '"', 0.7179, 126.87, 170.54, 29.37, 2023.89, 16.3, 'e', 'G17'],
  ['S175', 0.414, '"', 0.9867, 88.53, 326.83, 68.52, 2009.51, 17.5, 'e', 'G17'],
  // P20 prints omega before Omega; the rows here keep Omega first.
  ['S62', 3.588, 'mpc', 0.976, 72.76, 122.61, 42.62, 2003.33, 16.1, 'u', 'P20'],
  ['S4711', 3.002, 'mpc', 0.768, 114.71, 20.10, 131.59, 2010.85, 18.4, 'u', 'P20'],
  ['S4714', 4.079, 'mpc', 0.985, 127.70, 129.28, 357.25, 2017.29, 17.7, 'u', 'P20'],
  ['S4716', 1.94, 'mpc', 0.756, 161.13, 153.55, 2.25, 2017.41, null, 'u', 'P22'],
];

// GR22: the hole's mass in suns and the distance in parsecs.
const MASS = 4.297e6, R0 = 8277;
// One arcsec at R0, and one mpc, in AU.
const AU = { '"': R0, mpc: 206.265 };
// The toy's clock: one year of orbit in seconds; S2 laps in about 24 s.
export const YEAR_S = 1.5;
// The visit's clock starts here, so S2 swings past the hole soon after the glide.
const T0 = 2014.2;
// SCALE: S2's far point stands 20 hole radii out; true, it is about 9,000.
// One scale for every orbit, so each keeps its true shape.
const AU_R = 20 / (0.12495 * R0 * 1.88441);
// A deep plunge rounds off at this radius, just outside the photon ring.
const SOFT = 1.15;

const rad = Math.PI / 180;
const STARS = ELEMENTS.map(([name, a, unit, e, i, O, w, tp, mK, sp]) => {
  const aAU = a * AU[unit];
  return {
    name, e, tp,
    a: aAU * AU_R,
    // Kepler's third law: years from AU and suns.
    P: Math.sqrt(aAU ** 3 / MASS),
    ci: Math.cos(i * rad), si: Math.sin(i * rad), cO: Math.cos(O * rad), sO: Math.sin(O * rad), w: w * rad,
    // Light from the K magnitude, S2 as 1; the faint ones keep a floor.
    light: mK == null ? 0.3 : Math.max(0.3, Math.sqrt(10 ** (-0.4 * (mK - 13.95)))),
    col: sp === 'l' ? [255, 186, 128] : sp === 'e' ? [186, 212, 255] : [224, 230, 255],
  };
});

// The eccentric anomaly from the mean anomaly: Newton on Kepler's equation.
function anomaly(M, e) {
  let E = e > 0.8 ? Math.PI : M;
  for (let k = 0; k < 12; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-9) break;
  }
  return E;
}
// A star's place at year t, in hole radii: x west, y north, z toward the eye.
function place(s, t) {
  const M = 2 * Math.PI * ((((t - s.tp) / s.P) % 1 + 1) % 1);
  const E = anomaly(M, s.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + s.e) * Math.sin(E / 2), Math.sqrt(1 - s.e) * Math.cos(E / 2));
  const r = s.a * (1 - s.e * Math.cos(E));
  const u = s.w + nu, cu = Math.cos(u), su = Math.sin(u);
  // Thiele-Innes: north, east, and the depth away from the eye.
  const north = r * (s.cO * cu - s.sO * su * s.ci);
  const east = r * (s.sO * cu + s.cO * su * s.ci);
  const away = r * su * s.si;
  // The plunge rounds off: the radius eases up to SOFT, the direction holds.
  const k = Math.hypot(r, SOFT) / r;
  return [-east * k, north * k, -away * k];
}

// Samples per trail: enough that a pericentre whip stays a smooth curve.
const TRAIL = 120;
// The disc runs from the ISCO to 20 Schwarzschild radii; a hole radius is 2.6.
const DISC = [3 / 2.6, 20 / 2.6];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Builds the S stars' layer over the stage's GL canvas.
 * @param {HTMLCanvasElement} after The GL canvas; the layer sits just above it.
 */
export function makeSStars(after) {
  const cv = document.createElement('canvas');
  cv.className = 'on';
  cv.setAttribute('aria-hidden', 'true');
  // Light adds to the frame, as the star's own glow does.
  cv.style.cssText = 'pointer-events: none; mix-blend-mode: screen;';
  after.after(cv);
  const g = cv.getContext('2d');
  let t = T0, drawn = false, W = 0, H = 0;
  const pts = new Float32Array(TRAIL * 3);

  function clear() {
    if (!drawn) return;
    g.clearRect(0, 0, cv.width, cv.height);
    drawn = false;
  }
  return {
    // A new visit starts the clock again.
    reset() { t = T0; },
    step(dt) { t += dt / YEAR_S; },
    /**
     * Draws the stars, or clears the layer when off.
     * @param {{ on: boolean, light: number, view: { cx: number, cy: number, hw: number, hh: number },
     *   w: number, h: number, dpr: number, R: number, cam: (p: number[]) => number[],
     *   rot: number[][], tilt: number, far: number }} o
     * rot turns the star's frame to the view; tilt leans the disc; far is 0 at the full view, 1 at x32.
     */
    draw(o) {
      if (!o.on || o.light <= 0.001) { clear(); return; }
      const dpr = Math.min(2, o.dpr);
      const w = Math.round(o.w * dpr), h = Math.round(o.h * dpr);
      if (w !== W || h !== H) { cv.width = W = w; cv.height = H = h; }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'lighter';
      const v = o.view, R = o.R;
      const sx = x => ((x - v.cx) / v.hw * 0.5 + 0.5) * o.w;
      const sy = y => (0.5 - (y - v.cy) / v.hh * 0.5) * o.h;
      // CSS pixels per hole radius.
      const ppr = R * o.h / (2 * v.hh);
      // The view frame to the hole's frame, as the GL pass does: the disc lies in y = 0.
      const ct = Math.cos(o.tilt), st = Math.sin(o.tilt), M = o.rot;
      const hole = p => {
        const q = [0, 1, 2].map(c => M[0][c] * p[0] + M[1][c] * p[1] + M[2][c] * p[2]);
        return [q[0], ct * q[1] + st * q[2], -st * q[1] + ct * q[2]];
      };
      const eye = hole([0, 0, 1]);
      // How much light reaches the eye: the shadow hides, the disc's gas dims.
      const seen = p => {
        if (p[2] < 0 && Math.hypot(p[0], p[1]) < 1.08) return 0;
        const q = hole(p), s = -q[1] / eye[1];
        if (!(s > 0)) return 1;
        const r = Math.hypot(q[0] + s * eye[0], q[2] + s * eye[2]);
        return r > DISC[0] && r < DISC[1] ? 0.3 : 1;
      };
      // Close in, the trails step back, so the hole's own picture leads.
      const tr = 0.45 + 0.55 * smooth(0, 0.25, o.far);
      for (const s of STARS) {
        // The trail covers a fixed stretch of time, so it streaks where the star runs fast.
        const span = Math.min(0.45 * s.P, 5);
        for (let k = 0; k < TRAIL; k++) {
          const p = o.cam(place(s, t - span * k / (TRAIL - 1)));
          // Near the hole the trail fades, so no line cuts across the disc.
          pts.set([p[0], p[1], seen(p) * (0.2 + 0.8 * smooth(1.3, 5, Math.hypot(p[0], p[1])))], k * 3);
        }
        const [r, gr, b] = s.col;
        g.lineWidth = 1.25;
        g.lineCap = 'round';
        for (let k = 1; k < TRAIL; k++) {
          const vis = Math.min(pts[k * 3 + 2], pts[(k - 1) * 3 + 2]);
          if (!vis) continue;
          const a = vis * tr * (0.3 + 0.35 * s.light) * o.light * (1 - k / TRAIL) ** 1.3;
          g.strokeStyle = `rgba(${r},${gr},${b},${a.toFixed(3)})`;
          g.beginPath();
          g.moveTo(sx(pts[(k - 1) * 3] * R), sy(pts[(k - 1) * 3 + 1] * R));
          g.lineTo(sx(pts[k * 3] * R), sy(pts[k * 3 + 1] * R));
          g.stroke();
        }
        const lit = seen(o.cam(place(s, t))) * o.light;
        if (!lit) continue;
        const x = sx(pts[0] * R), y = sy(pts[1] * R);
        if (x < -40 || y < -40 || x > o.w + 40 || y > o.h + 40) continue;
        // A star is a point: a hot core in a soft glow, sized by its light.
        const core = 1 + 1.1 * s.light, halo = core * (4 + 0.004 * ppr);
        const gd = g.createRadialGradient(x, y, 0, x, y, halo);
        gd.addColorStop(0, `rgba(255,255,255,${lit.toFixed(3)})`);
        gd.addColorStop(core / halo, `rgba(${r},${gr},${b},${(0.85 * lit).toFixed(3)})`);
        gd.addColorStop(Math.min(0.999, 2.4 * core / halo), `rgba(${r},${gr},${b},${(0.18 * s.light * lit).toFixed(3)})`);
        gd.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        g.fillStyle = gd;
        g.beginPath();
        g.arc(x, y, halo, 0, 2 * Math.PI);
        g.fill();
      }
      drawn = true;
    },
  };
}
