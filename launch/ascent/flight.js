// Act 2 flight: every state is a function of time t in seconds.
// Time zero is the cut from the tripod to the hull cameras.
// Units are kilometres; the Earth's centre is the origin.
// The orbit plane is x-y; the pad stands at (0, R, 0) and flies toward +x.

export const R = 6371;
export const EV = { maxq: 36, meco: 80, sep: 83, ign2: 87, fairing: 98, seco: 138, tli: 150, tliEnd: 168, probeSep: 176, deploy: 182, deployEnd: 202, far: 250, end: 420 };

// Altitude and downrange keys for the climb, in seconds and kilometres.
const H_KEYS = [[0, 0.4], [10, 1.6], [20, 4.5], [36, 12], [50, 24], [65, 42], [80, 66], [98, 100], [118, 135], [138, 165]];
const X_KEYS = [[0, 0], [10, 0.1], [20, 0.8], [36, 4], [50, 12], [65, 30], [80, 75], [98, 210], [118, 520], [138, 1100]];
// Distance from the Earth's centre after the escape burn.
const R_ORBIT = R + 165, R_FAR = 1.4e6;

// Monotone cubic through keys: no overshoot between them.
function pchip(keys) {
  const n = keys.length, x = keys.map(k => k[0]), y = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const h0 = x[i] - x[i - 1], h1 = x[i + 1] - x[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return t => {
    if (t <= x[0]) return y[0] + m[0] * (t - x[0]);
    if (t >= x[n - 1]) return y[n - 1] + m[n - 1] * (t - x[n - 1]);
    let i = 0;
    while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
const hAt = pchip(H_KEYS), xAt = pchip(X_KEYS);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The path as a table of radius and angle, built once.
// The angle rate keeps the orbit's angular momentum after the escape burn.
const DT = 0.05, N = Math.ceil(EV.end / DT) + 2;
const TR = new Float64Array(N), TA = new Float64Array(N);
{
  const w0 = (xAt(EV.seco) - xAt(EV.seco - 1)) / R_ORBIT;
  let a = 0;
  for (let i = 0; i < N; i++) {
    const t = i * DT;
    if (t <= EV.seco) { TR[i] = R + hAt(t); a = xAt(t) / R; TA[i] = a; continue; }
    // The escape: slow at first, then the Earth falls away fast.
    const k = Math.pow(Math.min(1, Math.max(0, (t - EV.tli) / (EV.far - EV.tli))), 3);
    TR[i] = t < EV.tli ? R_ORBIT : R_ORBIT * Math.exp(Math.log(R_FAR / R_ORBIT) * k);
    // Past the far mark the probe coasts on, steady and slow.
    if (t > EV.far) TR[i] = R_FAR * (1 + (t - EV.far) / 30);
    a += w0 * (R_ORBIT / TR[i]) ** 2 * DT;
    TA[i] = a;
  }
}
function polar(t) {
  const f = Math.min(Math.max(t, 0), EV.end) / DT, i = Math.floor(f), u = f - i;
  return [TR[i] + (TR[i + 1] - TR[i]) * u, TA[i] + (TA[i + 1] - TA[i]) * u];
}
// Position in kilometres at time t, written to out as x, y, z.
export function posAt(t, out = [0, 0, 0]) {
  const [r, a] = polar(t);
  out[0] = r * Math.sin(a); out[1] = r * Math.cos(a); out[2] = 0;
  return out;
}

const pa = [0, 0, 0], pb = [0, 0, 0];
// The whole state at time t.
export function flightAt(t) {
  const p = posAt(t, [0, 0, 0]);
  const r = Math.hypot(p[0], p[1]);
  const h = r - R;
  // The axis follows the velocity; the first seconds stay upright.
  posAt(t - 0.4, pa); posAt(t + 0.4, pb);
  let vx = pb[0] - pa[0], vy = pb[1] - pa[1];
  const vl = Math.hypot(vx, vy) || 1;
  vx /= vl; vy /= vl;
  const up = [p[0] / r, p[1] / r, 0];
  const lift = 1 - smooth(4, 14, t);
  const ax = [vx + (up[0] - vx) * lift, vy + (up[1] - vy) * lift, 0];
  const al = Math.hypot(ax[0], ax[1]);
  ax[0] /= al; ax[1] /= al;
  const speed = vl / 0.8;
  const stage = t < EV.sep ? 1 : 2;
  // Throttle: a bucket through max-q, then off at MECO.
  const thrust1 = t < EV.meco ? 1 - 0.3 * Math.exp(-(((t - EV.maxq) / 7) ** 2)) : 0;
  const burn2 = (t >= EV.ign2 && t < EV.seco) || (t >= EV.tli && t < EV.tliEnd);
  const thrust2 = burn2 ? Math.min(1, (t - (t < EV.seco ? EV.ign2 : EV.tli)) / 1.5) : 0;
  const rho = Math.exp(-Math.max(h, 0) / 8);
  const q = Math.exp(-(((t - EV.maxq) / 13) ** 2));
  return { t, p, r, h, up, axis: ax, speed, stage, thrust1, thrust2, rho, q, fairing: t < EV.fairing };
}

// The sun: below the pad's horizon at dawn, a little north of east.
// dep is the sun's depression at the pad, in degrees.
export function sunDir(dep, out = [0, 0, 0]) {
  const el = -dep * Math.PI / 180, az = 22 * Math.PI / 180;
  out[0] = Math.cos(el) * Math.cos(az); out[1] = Math.sin(el); out[2] = Math.cos(el) * Math.sin(az);
  return out;
}

// Sunlight through the air at point p, per channel; zero in the Earth's shadow.
const BR = [5.802e-3, 13.558e-3, 33.1e-3], BME = 4.44e-3, BO = [0.65e-3, 1.881e-3, 0.085e-3];
export function sunLight(p, sun, out = [0, 0, 0]) {
  const r = Math.hypot(p[0], p[1], p[2]);
  const b = p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2];
  const rmin = b < 0 ? Math.sqrt(Math.max(0, r * r - b * b)) : r;
  const vis = smooth(-2, 2, rmin - R);
  const top = R + 100;
  const tTop = r < top ? -b + Math.sqrt(Math.max(0, b * b - (r * r - top * top))) : 0;
  let dR = 0, dM = 0, dO = 0;
  const n = 48, ds = tTop / n;
  for (let i = 0; i < n && tTop > 0; i++) {
    const s = (i + 0.5) * ds;
    const hh = Math.max(0, Math.hypot(p[0] + sun[0] * s, p[1] + sun[1] * s, p[2] + sun[2] * s) - R);
    dR += Math.exp(-hh / 8) * ds; dM += Math.exp(-hh / 1.2) * ds; dO += Math.max(0, 1 - Math.abs(hh - 25) / 15) * ds;
  }
  for (let c = 0; c < 3; c++) out[c] = vis * Math.exp(-(BR[c] * dR + BME * dM + BO[c] * dO));
  return out;
}
