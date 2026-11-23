// Stir vortex: sizes, the camera, the free surface and the stirred flow.
// All sizes are in metres. The bench is y = 0; the beaker axis is x = z = 0.

export const RIG = {
  // The stirrer body: half width, height, half depth, corner radius.
  BX: 0.095, BH: 0.052, BZ: 0.1, BR: 0.012,
  // The top of the white ceramic plate.
  PT: 0.0555,
  // The beaker: outer radius, wall, floor thickness, height.
  RB: 0.044, TH: 0.0019, BT: 0.003, HB: 0.118,
  // The knob on the front face: centre x, y, radius, depth.
  KX: 0.056, KY: 0.025, KR: 0.0135, KD: 0.013,
  // The stir bar: half length, radius.
  BL: 0.019, BRAD: 0.0042,
  // Water depth over the floor at rest.
  WD: 0.07,
};
RIG.RI = RIG.RB - RIG.TH;
RIG.FL = RIG.PT + RIG.BT;
RIG.TOP = RIG.PT + RIG.HB;
RIG.WL = RIG.FL + RIG.WD;
RIG.BARY = RIG.FL + RIG.BRAD + 0.0004;
// The dye grid: x and z cells, y slices, slices per atlas row, and the height it spans.
RIG.GN = 112; RIG.GS = 64; RIG.GC = 8; RIG.GH = 0.085;

// The funnel: tip radius, shape power, and the deepest dip at full speed.
export const FUNNEL = { A: 0.0042, P: 0.62 };
FUNNEL.DMAX = (RIG.WL - (RIG.BARY + RIG.BRAD + 0.0035));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- camera ---------- */
// A fixed camera a little above the water line. fit() frames the rig in the free stage.
export function makeCamera() {
  const aim = [0.0, 0.082, 0.0];
  const from = norm([0.16, 0.3, 1.0]);
  const cam = { pos: [0, 0, 0], rot: new Float32Array(9), lens: [0.3, 0.2, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], w: 1, h: 1 };
  cam.fit = (w, h, top = 0, bottom = 0) => {
    cam.w = w; cam.h = h;
    const asp = w / h;
    const free = Math.max(0.4, (h - top - bottom) / h);
    const d = 0.8;
    // The content: the beaker and the knob, 0.2 m wide and 0.19 m tall.
    // A portrait stage crops the stirrer's sides: the beaker and the knob stay.
    const wide = asp < 0.8 ? 0.16 : 0.21;
    const tanY = Math.max(0.2 / (2 * d * free * 0.9), wide / (2 * d * asp * 0.9));
    cam.lens = [tanY * asp, tanY, (bottom - top) / h];
    cam.pos = [aim[0] + from[0] * d, aim[1] + from[1] * d, aim[2] + from[2] * d];
    const back = norm(sub(cam.pos, aim));
    const right = norm(cross([0, 1, 0], back));
    const up = cross(back, right);
    cam.right = right; cam.up = up; cam.back = back;
    cam.rot.set([...right, ...up, ...back]);
  };
  // A world point to stage CSS pixels, or null behind the camera.
  cam.project = p => {
    const v = sub(p, cam.pos);
    const z = -dot(v, cam.back);
    if (z <= 1e-4) return null;
    const sx = dot(v, cam.right) / z / cam.lens[0];
    const sy = dot(v, cam.up) / z / cam.lens[1] + cam.lens[2];
    return [(sx + 1) / 2 * cam.w, (1 - sy) / 2 * cam.h];
  };
  // A stage point to a world ray direction.
  cam.ray = (x, y) => {
    const sx = (x / cam.w) * 2 - 1, sy = (1 - y / cam.h) * 2 - 1 - cam.lens[2];
    const a = sx * cam.lens[0], b = sy * cam.lens[1];
    return norm([cam.right[0] * a + cam.up[0] * b - cam.back[0], cam.right[1] * a + cam.up[1] * b - cam.back[1], cam.right[2] * a + cam.up[2] * b - cam.back[2]]);
  };
  // Metres per CSS pixel at a world point.
  cam.scale = p => {
    const z = -dot(sub(p, cam.pos), cam.back);
    return (2 * z * cam.lens[1]) / cam.h;
  };
  return cam;
}

/* ---------- the free surface ---------- */
// The funnel shape F(r): 1 at the axis, a power tail outside the tip.
const shapeF = r => Math.pow(1 + (r / FUNNEL.A) ** 2, -FUNNEL.P);
// The mean of F over the beaker floor, so the dip keeps the volume.
export const FMEAN = (() => {
  const { A, P } = FUNNEL, X = (RIG.RI / A) ** 2;
  return (A * A / (RIG.RI * RIG.RI)) * (Math.pow(1 + X, 1 - P) - 1) / (1 - P);
})();
// The surface height at radius r for a dip of depth d.
export const surfaceY = (r, d) => RIG.WL + d * (FMEAN - shapeF(r));
// The dip for a water spin of 0 to 1: the centrifugal head grows with the square.
export const dipOf = s => FUNNEL.DMAX * s * s / (1 - FMEAN);

/* ---------- the stirred flow ---------- */
// Angular speed of the water at full spin, at the axis, in radians per second.
export const OMEGA0 = 2 * Math.PI * 4.5;
// The vortex core radius.
const RC = 0.006;
// Angular speed at radius r and height y, for a spin of s.
export function omegaAt(r, y, s) {
  let w = OMEGA0 * s / (1 + (r / RC) ** 2);
  // The wall and the floor hold the water back in thin layers.
  w *= clamp((RIG.RI - r) / 0.004, 0.25, 1) * clamp((y - RIG.FL) / 0.004, 0.35, 1);
  return w;
}

/* ---------- dye tracers ---------- */
// Each drop is a cloud of tracers. Differential rotation shears it into threads.
// Ekman pumping carries them: out on the floor, up the wall, in under the surface, down the core.
export const CAP = 48000;
export const PER_DROP = 12000;

export function makeDye() {
  const P = {
    n: 0,
    x: new Float32Array(CAP), y: new Float32Array(CAP), z: new Float32Array(CAP),
    vx: new Float32Array(CAP), vy: new Float32Array(CAP), vz: new Float32Array(CAP),
    w: new Float32Array(CAP), dye: new Uint8Array(CAP), drop: new Int32Array(CAP),
    // The packed upload: x, y, z, dye * 4 + weight.
    buf: new Float32Array(CAP * 4),
    drops: [],
    nextId: 1,
    // Uniform tint from dye that has mixed out: absorption by dye kind.
    tint: [0, 0, 0],
  };
  return P;
}

// Gaussian pair from two uniforms.
function gauss() {
  const u = Math.max(1e-7, Math.random()), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Adds one drop at (x, z) on the surface. dye is 0, 1 or 2. Returns its id.
export function addDrop(P, x, z, dye, d, speed = 1) {
  // A full set retires the oldest drop into the uniform tint.
  while (P.n + PER_DROP > CAP && P.drops.length) retire(P, P.drops[0].id);
  const id = P.nextId++;
  const r = Math.hypot(x, z);
  const y0 = surfaceY(r, d) - 0.0015;
  // The drop spreads into a flat lens under the surface, then the flow takes it.
  for (let k = 0; k < PER_DROP; k++) {
    const i = P.n++;
    const gx = gauss(), gy = gauss(), gz = gauss();
    P.x[i] = x + gx * 0.0024; P.y[i] = y0 - Math.abs(gy) * 0.0012; P.z[i] = z + gz * 0.0024;
    const hr = Math.hypot(gx, gz) || 1;
    const out = 0.01 * Math.random();
    P.vx[i] = gx / hr * out; P.vz[i] = gz / hr * out;
    // A few fingers plunge deeper than the rest.
    P.vy[i] = -(0.008 + 0.02 * Math.random() ** 3) * speed;
    P.w[i] = 1; P.dye[i] = dye; P.drop[i] = id;
  }
  P.drops.push({ id, dye, age: 0, fade: 1 });
  return id;
}

// The oldest drop leaves the tracer set; its dye joins the tint.
function retire(P, id) {
  const k = P.drops.findIndex(d => d.id === id);
  if (k < 0) return;
  const dr = P.drops[k];
  P.tint[dr.dye] += dr.fade * MIX_TINT;
  let j = 0;
  for (let i = 0; i < P.n; i++) {
    if (P.drop[i] === id) continue;
    if (j !== i) {
      P.x[j] = P.x[i]; P.y[j] = P.y[i]; P.z[j] = P.z[i];
      P.vx[j] = P.vx[i]; P.vy[j] = P.vy[i]; P.vz[j] = P.vz[i];
      P.w[j] = P.w[i]; P.dye[j] = P.dye[i]; P.drop[j] = P.drop[i];
    }
    j++;
  }
  P.n = j;
  P.drops.splice(k, 1);
}
// The tint one full drop gives once it has mixed through the beaker.
export const MIX_TINT = 1;

// Clears all dye. Used by Rinse once the water is fresh.
export function clearDye(P) {
  P.n = 0; P.drops.length = 0; P.tint = [0, 0, 0];
}

// Moves every tracer by dt seconds. s is the water spin, d the dip, ph the flow time.
// Eddies: a few smooth shear waves, each free of divergence.
// Neighbouring tracers move together, so threads fold but stay threads.
const MODES = (() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  for (let i = 0; i < 6; i++) {
    const k = norm([rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7, rnd() * 2 - 1]);
    let a = cross(k, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]));
    a = norm(a);
    const kk = 140 + 260 * rnd();
    out.push({ k: k.map(v => v * kk), a, w: 0.6 + 1.6 * rnd(), ph: rnd() * 6.283 });
  }
  return out;
})();

export function stepDye(P, dt, s, d, calm = false) {
  const { RI, FL } = RIG;
  const s2 = Math.min(1, s * 1.15);
  P.t = (P.t || 0) + dt * (0.3 + s2);
  const T = P.t;
  // Secondary flow speeds, metres per second at full spin.
  const UR = 0.0085 * s2, UY = 0.009 * s2;
  // Eddy speed and a faint molecular spread.
  const UE = calm ? 0 : 0.0022 * s2 + 0.0002;
  const sig = calm ? 0 : Math.sqrt(2 * 1.2e-7 * dt);
  const relax = Math.exp(-dt / 0.32);
  // Dye is a little denser than water.
  const SINK = 0.0009;
  const lim = RI - 0.0007;
  const M = MODES.map(m => ({ k: m.k, a: m.a, p: m.ph + m.w * T }));
  for (let i = 0; i < P.n; i++) {
    let x = P.x[i], y = P.y[i], z = P.z[i];
    const r = Math.hypot(x, z) || 1e-6;
    const hs = surfaceY(r, d);
    const zeta = clamp((y - FL) / Math.max(0.004, hs - FL));
    const rho = clamp(r / RI);
    // Rotation: an exact turn by the local angular speed.
    const a = omegaAt(r, y, s) * dt;
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = ca * x - sa * z, nz = sa * x + ca * z;
    x = nx; z = nz;
    // Ekman cell: out near the floor, in near the surface.
    // The inflow runs in a layer under the surface; the outflow hugs the floor.
    const prof = zeta > 0.5 ? -Math.pow((zeta - 0.5) * 2, 2) : Math.pow((0.5 - zeta) * 2, 3) * 0.8;
    let vr = UR * 4 * rho * (1 - rho) * prof * (1 + 1.5 * Math.exp(-(((r - 0.012) / 0.01) ** 2)));
    // The jet spins too fast to close on the axis: the dye winds round it as a tube.
    vr = vr * clamp((r - 0.0015) / 0.006) + 0.004 * s2 * clamp(1 - r / 0.0045);
    // Up along the wall, a strong jet down the core.
    const jet = Math.exp(-((r / 0.005) ** 2)) * 1.1 + Math.exp(-((r / 0.016) ** 2)) * 0.45;
    const vy = UY * Math.sin(Math.PI * Math.max(zeta, 0.12)) * (0.55 * clamp((rho - 0.45) / 0.4) - jet) - SINK;
    // Eddies.
    let ex = 0, ey = 0, ez = 0;
    if (UE > 0) {
      for (let m = 0; m < 6; m++) {
        const q = M[m], sn = Math.sin(q.k[0] * x + q.k[1] * y + q.k[2] * z + q.p);
        ex += q.a[0] * sn; ey += q.a[1] * sn; ez += q.a[2] * sn;
      }
      ex *= UE; ey *= UE * 0.6; ez *= UE;
    }
    // The plunge of the drop dies away.
    const mx = P.vx[i], my = P.vy[i], mz = P.vz[i];
    P.vx[i] = mx * relax; P.vy[i] = my * relax; P.vz[i] = mz * relax;
    const rn = r + vr * dt;
    const k = rn / r;
    x = x * k + (mx + ex) * dt + (sig ? gauss() * sig : 0);
    z = z * k + (mz + ez) * dt + (sig ? gauss() * sig : 0);
    y = y + (vy + my + ey) * dt + (sig ? gauss() * sig : 0);
    // Keep inside the water: the wall, the floor and under the surface.
    const r2 = Math.hypot(x, z);
    if (r2 > lim) { const q = lim / r2; x *= q; z *= q; P.vx[i] = 0; P.vz[i] = 0; }
    if (y < FL + 0.0006) { y = FL + 0.0006; P.vy[i] = 0; }
    const top = surfaceY(Math.min(r2, lim), d) - 0.0007;
    if (y > top) {
      // A tracer at the surface bounces back under it: no sheet builds up.
      y = top - Math.min(0.003, y - top) - Math.random() * 0.0008;
      if (P.vy[i] > 0) P.vy[i] = 0;
      // Under the funnel wall, the inflow pushes the dye down along it.
      if (r2 < 0.01 && d > 0.004) { const sl = Math.min(1, 0.012 / Math.max(r2, 0.0015)); y -= UY * 0.3 * sl * dt; }
    }
    P.x[i] = x; P.y[i] = y; P.z[i] = z;
  }
  for (const dr of P.drops) dr.age += dt;
}

// Packs tracers for the splat pass. Returns the count.
export function packDye(P, fade = 1) {
  const b = P.buf, f = new Map(P.drops.map(d => [d.id, d.fade * fade]));
  let n = 0;
  for (let i = 0; i < P.n; i++) {
    const w = (f.get(P.drop[i]) ?? 0) * P.w[i];
    if (w <= 0.001) continue;
    b[n * 4] = P.x[i]; b[n * 4 + 1] = P.y[i]; b[n * 4 + 2] = P.z[i];
    b[n * 4 + 3] = P.dye[i] * 4 + Math.min(1, w) * 0.999;
    n++;
  }
  return n;
}
