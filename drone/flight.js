// Faux flight model for a heavy-lift X8: eight rotors on four hubs.
// SI units. World: y up. Body: x nose, y up, z right.
// No dependencies, so node tests can run it.

const G = 9.81;
const H = 1 / 240;   // physics step, seconds
const DEG = Math.PI / 180;

export const MODES = ['position', 'angle', 'acro'];

export const P = {
  mass: 9,
  inertia: [.85, 1.3, .5],   // roll, yaw, pitch, in kg m²
  twr: 2.2,                  // thrust to weight at full throttle
  tauUp: .05, tauDown: .09,  // motor spin-up and spin-down lag
  idle: .04,                 // armed idle, share of full thrust
  kQ: .03,                   // prop drag torque per newton of thrust
  rpmMax: 7200,
  propR: .23,
  drag: [.09, .45, .09],     // quadratic drag, body axes
  dragLin: .35,              // rotor H-force, linear in airspeed
  angDamp: .25,
  tilt: { position: 25 * DEG, angle: 35 * DEG },
  rate: 200 * DEG,           // acro roll and pitch rate at full stick
  yaw: 70 * DEG,
  vMax: 14, climb: 4, sink: 3,
  wind: 3,                   // mean wind speed, m/s
  contact: { k: 7000, c: 250, kt: 300, mu: .7 },
  crash: { impact: 4, touch: 1.6, tilt: 62 * DEG }
};

// Gains: angle to rate, rate to angular acceleration.
const K = { ang: 4.5, rate: [10, 6, 10], rateI: [5, 2, 5], hdg: 2.5, vel: 1.6, velI: .6, pos: .9, vz: 3, vzI: 1.5, alt: 1.2 };

// ── small vector and quaternion helpers, on plain arrays ───────────────
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function rot(q, v, out = [0, 0, 0]) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  out[0] = vx + w * tx + y * tz - z * ty;
  out[1] = vy + w * ty + z * tx - x * tz;
  out[2] = vz + w * tz + x * ty - y * tx;
  return out;
}
function unrot(q, v, out) { return rot([-q[0], -q[1], -q[2], q[3]], v, out); }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Euler angles in the order yaw, pitch, roll.
// Roll turns about x, pitch about z, yaw about y.
export function euler(q) {
  const [x, y, z, w] = q;
  const m11 = 1 - 2 * (y * y + z * z), m21 = 2 * (x * y + w * z), m22 = 1 - 2 * (x * x + z * z);
  const m23 = 2 * (y * z - w * x), m31 = 2 * (x * z - w * y);
  return { roll: Math.atan2(-m23, m22), pitch: Math.asin(clamp(m21, -1, 1)), yaw: Math.atan2(-m31, m11) };
}
export function yawQuat(a) { return [0, Math.sin(a / 2), 0, Math.cos(a / 2)]; }

/**
 * Make a simulator.
 * @param {{ rotors: {x:number,y:number,z:number,dir:number}[], contacts: number[][], feet?: number,
 *   obstacles?: {x:number,z:number,r:number,h:number}[], boxes?: {x:number,z:number,hx:number,hz:number,h:number}[],
 *   ground?: (x:number,z:number)=>number }} cfg
 */
export function createSim(cfg) {
  const R = cfg.rotors, n = R.length, C = cfg.contacts, feet = cfg.feet ?? 4;
  const ground = cfg.ground || (() => 0);
  const obstacles = cfg.obstacles || [], boxes = cfg.boxes || [];
  const m = P.mass, I = P.inertia, tMax = P.twr * m * G / n;
  const sx2 = R.reduce((t, r) => t + r.x * r.x, 0), sz2 = R.reduce((t, r) => t + r.z * r.z, 0);
  // The body centre sits this high when the feet touch the ground.
  const rest = -Math.min(...C.slice(0, feet).map(c => c[1]));

  const s = {
    p: [0, rest, 0], v: [0, 0, 0], q: [0, 0, 0, 1], w: [0, 0, 0],
    f: new Float64Array(n), cmd: new Float64Array(n), thrust: new Float64Array(n),
    input: { roll: 0, pitch: 0, yaw: 0, thr: 0 },
    mode: 'position', windOn: true, wind: [0, 0, 0],
    armed: false, landed: true, crashed: false, t: 0, armedAt: 0, quietFor: 0,
    holdAlt: null, holdPos: null, holdYaw: null, iVel: [0, 0], iVz: 0, iRate: [0, 0, 0], acc: 0,
    impact: 0
  };

  function windAt(t) {
    if (!s.windOn) return [0, 0, 0];
    const g = 1 + .35 * Math.sin(.31 * t) + .2 * Math.sin(1.07 * t + 2) + .1 * Math.sin(2.9 * t + 1);
    const side = .5 * Math.sin(.53 * t + .7);
    // The wind blows from the west, toward +x, with a slow veer.
    return [P.wind * g, .3 * Math.sin(.8 * t) * P.wind / 3, side * P.wind / 3];
  }

  // Split collective thrust and body torques over the rotors.
  // Roll and pitch come first; yaw takes the headroom left.
  function mix(Tc, tau) {
    const lo = s.armed ? P.idle * tMax : 0, hi = tMax, rp = new Float64Array(n), yw = new Float64Array(n);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) {
      rp[i] = tau[0] * -R[i].z / sz2 + tau[2] * R[i].x / sx2;
      yw[i] = -R[i].dir * tau[1] / (n * P.kQ);
      mn = Math.min(mn, rp[i]); mx = Math.max(mx, rp[i]);
    }
    const span = mx - mn;
    if (span > hi - lo) { const k = (hi - lo) / span; for (let i = 0; i < n; i++) rp[i] *= k; mn *= k; mx *= k; }
    const base = clamp(Tc / n, lo - mn, hi - mx);
    let k = 1;
    for (let i = 0; i < n; i++) {
      const t = base + rp[i];
      if (yw[i] > 0) k = Math.min(k, (hi - t) / yw[i]);
      else if (yw[i] < 0) k = Math.min(k, (lo - t) / yw[i]);
    }
    k = Math.max(0, k);
    for (let i = 0; i < n; i++) s.cmd[i] = clamp((base + rp[i] + k * yw[i]) / tMax, 0, 1);
  }

  function resetLoops() { s.iVel = [0, 0]; s.iVz = 0; s.iRate = [0, 0, 0]; s.holdAlt = null; s.holdPos = null; s.holdYaw = null; }

  function control(h) {
    const inp = s.input, mode = s.mode;
    if (s.crashed) { s.cmd.fill(0); return; }
    // Arm on a throttle push from the ground.
    if (!s.armed) {
      s.cmd.fill(0);
      if (s.landed && inp.thr > .3) { s.armed = true; s.armedAt = s.t; resetLoops(); }
      return;
    }
    const e = euler(s.q), agl = s.p[1] - rest - ground(s.p[0], s.p[2]);
    const wantsUp = mode === 'acro' ? inp.thr > -.3 : inp.thr > .1;
    // Disarm after a quiet spell on the ground.
    if (s.landed && !wantsUp) {
      s.quietFor += h;
      if (s.quietFor > 2.5) { s.armed = false; s.cmd.fill(0); return; }
      resetLoops();
      mix(0, [0, 0, 0]);
      return;
    }
    s.quietFor = 0;
    // The motors spin up before the craft may lift.
    const spin = s.t - s.armedAt < .6;

    let Tc, wt;
    if (mode === 'acro') {
      wt = [inp.roll * P.rate, -inp.yaw * P.yaw, -inp.pitch * P.rate];
      // Centre stick gives hover thrust; no altitude hold, no tilt help.
      Tc = m * G * (inp.thr >= 0 ? 1 + inp.thr * (P.twr - 1) : 1 + inp.thr * .85);
    } else {
      const tilt = P.tilt[mode];
      let rt, pt;
      if (mode === 'angle') {
        rt = inp.roll * tilt; pt = -inp.pitch * tilt;
      } else {
        const c = Math.cos(e.yaw), sn = Math.sin(e.yaw), fwd = [c, -sn], right = [sn, c];
        const v = [s.v[0], s.v[2]];
        let vt;
        if (Math.abs(inp.pitch) > .03 || Math.abs(inp.roll) > .03) {
          s.holdPos = null;
          vt = [(fwd[0] * inp.pitch + right[0] * inp.roll) * P.vMax, (fwd[1] * inp.pitch + right[1] * inp.roll) * P.vMax];
        } else {
          if (!s.holdPos && Math.hypot(v[0], v[1]) < 1) s.holdPos = [s.p[0], s.p[2]];
          vt = s.holdPos ? [K.pos * (s.holdPos[0] - s.p[0]), K.pos * (s.holdPos[1] - s.p[2])] : [0, 0];
          const l = Math.hypot(vt[0], vt[1]);
          if (l > 3) { vt[0] *= 3 / l; vt[1] *= 3 / l; }
        }
        const ex = vt[0] - v[0], ez = vt[1] - v[1], aMax = G * Math.tan(tilt);
        s.iVel[0] = clamp(s.iVel[0] + K.velI * ex * h, -3, 3);
        s.iVel[1] = clamp(s.iVel[1] + K.velI * ez * h, -3, 3);
        let ax = K.vel * ex + s.iVel[0], az = K.vel * ez + s.iVel[1];
        const al = Math.hypot(ax, az);
        if (al > aMax) { ax *= aMax / al; az *= aMax / al; }
        const af = ax * fwd[0] + az * fwd[1], ar = ax * right[0] + az * right[1];
        pt = -Math.atan(af / G); rt = Math.atan(ar / G);
      }
      // Heading hold: centre stick keeps the nose where it stopped.
      let yr = -inp.yaw * P.yaw;
      if (Math.abs(inp.yaw) > .03) s.holdYaw = null;
      else {
        if (s.holdYaw == null && Math.abs(s.w[1]) < .25) s.holdYaw = e.yaw;
        if (s.holdYaw != null) yr = clamp(K.hdg * Math.atan2(Math.sin(s.holdYaw - e.yaw), Math.cos(s.holdYaw - e.yaw)), -1, 1);
      }
      wt = [clamp(K.ang * (rt - e.roll), -3, 3), yr, clamp(K.ang * (pt - e.pitch), -3, 3)];

      // Altitude: the stick sets a climb rate; centre holds the height.
      let vzt;
      if (Math.abs(inp.thr) > .05) {
        s.holdAlt = null;
        vzt = inp.thr > 0 ? inp.thr * P.climb : inp.thr * P.sink;
        // Near the ground the descent slows for a soft landing.
        if (vzt < 0 && agl < 2) vzt = Math.max(vzt, -.6 - .5 * agl);
      } else {
        if (s.holdAlt == null && Math.abs(s.v[1]) < .5) s.holdAlt = s.p[1];
        vzt = s.holdAlt != null ? clamp(K.alt * (s.holdAlt - s.p[1]), -2, 2) : 0;
      }
      const ev = vzt - s.v[1];
      s.iVz = clamp(s.iVz + K.vzI * ev * h, -4, 4);
      const azc = clamp(K.vz * ev + s.iVz, -.7 * G, G);
      Tc = m * (G + azc) / Math.max(.5, Math.cos(e.roll) * Math.cos(e.pitch));
    }
    if (spin) Tc = Math.min(Tc, .5 * m * G);

    // Rate loop, in body axes.
    const tau = [0, 0, 0];
    for (let a = 0; a < 3; a++) {
      const er = wt[a] - s.w[a];
      s.iRate[a] = s.landed ? 0 : clamp(s.iRate[a] + er * h, -1, 1);
      tau[a] = I[a] * (K.rate[a] * er + K.rateI[a] * s.iRate[a]);
    }
    const Iw = [I[0] * s.w[0], I[1] * s.w[1], I[2] * s.w[2]], gy = cross(s.w, Iw);
    for (let a = 0; a < 3; a++) tau[a] += gy[a];
    mix(Tc, tau);
  }

  function crash() {
    if (s.crashed) return;
    s.crashed = true; s.armed = false;
  }

  const F = [0, 0, 0], tau = [0, 0, 0], tmp = [0, 0, 0], up = [0, 0, 0];
  function sub(h) {
    s.t += h;
    s.wind = windAt(s.t);
    control(h);

    // Motors follow their command with a lag.
    for (let i = 0; i < n; i++) {
      const tau_ = s.cmd[i] > s.f[i] ? P.tauUp : P.tauDown;
      s.f[i] += (s.cmd[i] - s.f[i]) * (1 - Math.exp(-h / tau_));
    }

    F[0] = 0; F[1] = -m * G; F[2] = 0;
    tau[0] = 0; tau[1] = 0; tau[2] = 0;
    rot(s.q, [0, 1, 0], up);
    const gy = ground(s.p[0], s.p[2]);
    for (let i = 0; i < n; i++) {
      const r = R[i];
      rot(s.q, [r.x, r.y, r.z], tmp);
      // Ground effect: more thrust close to the ground.
      const hh = Math.max(P.propR * .4, s.p[1] + tmp[1] - gy), k = P.propR / (4 * hh);
      const T = s.f[i] * tMax * Math.min(1.25, 1 / (1 - k * k));
      s.thrust[i] = T;
      F[0] += up[0] * T; F[1] += up[1] * T; F[2] += up[2] * T;
      tau[0] += -r.z * T; tau[2] += r.x * T;
      tau[1] += -r.dir * P.kQ * T;
    }

    // Drag on the airspeed, in body axes.
    const va = unrot(s.q, [s.v[0] - s.wind[0], s.v[1] - s.wind[1], s.v[2] - s.wind[2]]);
    const sp = Math.hypot(va[0], va[1], va[2]);
    const fb = [-(P.drag[0] * sp + P.dragLin) * va[0], -P.drag[1] * sp * va[1], -(P.drag[2] * sp + P.dragLin) * va[2]];
    rot(s.q, fb, tmp);
    F[0] += tmp[0]; F[1] += tmp[1]; F[2] += tmp[2];
    for (let a = 0; a < 3; a++) tau[a] -= P.angDamp * s.w[a];
    // Gusts rock the airframe a little.
    if (s.windOn) {
      tau[0] += .25 * Math.sin(1.7 * s.t) * Math.sin(.37 * s.t);
      tau[2] += .18 * Math.sin(2.3 * s.t + 1);
    }

    // Ground contact: a spring and damper at each point, with friction.
    const ww = rot(s.q, s.w);
    let feetDown = 0;
    for (let c = 0; c < C.length; c++) {
      const rw = rot(s.q, C[c]);
      const px = s.p[0] + rw[0], py = s.p[1] + rw[1], pz = s.p[2] + rw[2];
      const d = ground(px, pz) - py;
      if (d <= 0) continue;
      const wr = cross(ww, rw);
      const vc = [s.v[0] + wr[0], s.v[1] + wr[1], s.v[2] + wr[2]];
      const fn = Math.max(0, P.contact.k * d - P.contact.c * vc[1]);
      const vt = Math.hypot(vc[0], vc[2]), kt = vt > 1e-6 ? Math.min(P.contact.kt, P.contact.mu * fn / vt) : 0;
      const f = [-kt * vc[0], fn, -kt * vc[2]];
      F[0] += f[0]; F[1] += f[1]; F[2] += f[2];
      const tw = unrot(s.q, cross(rw, f));
      tau[0] += tw[0]; tau[1] += tw[1]; tau[2] += tw[2];
      const hit = Math.hypot(vc[0], vc[1], vc[2]);
      s.impact = Math.max(s.impact, -vc[1]);
      if (c < feet) feetDown++;
      if (-vc[1] > P.crash.impact) crash();
      if (c >= feet && hit > P.crash.touch) crash();
      // A fast skid on the feet trips the craft.
      if (c < feet && Math.hypot(vc[0], vc[2]) > 3.5) crash();
    }

    // Integrate: velocity first, then position.
    for (let a = 0; a < 3; a++) { s.v[a] += F[a] / m * h; s.p[a] += s.v[a] * h; }
    const Iw = [I[0] * s.w[0], I[1] * s.w[1], I[2] * s.w[2]], gw = cross(s.w, Iw);
    for (let a = 0; a < 3; a++) s.w[a] += (tau[a] - gw[a]) / I[a] * h;
    const [qx, qy, qz, qw] = s.q, [wx, wy, wz] = s.w, k = .5 * h;
    s.q[0] += k * (qw * wx + qy * wz - qz * wy);
    s.q[1] += k * (qw * wy + qz * wx - qx * wz);
    s.q[2] += k * (qw * wz + qx * wy - qy * wx);
    s.q[3] += k * (-qx * wx - qy * wy - qz * wz);
    const ql = Math.hypot(...s.q);
    for (let a = 0; a < 4; a++) s.q[a] /= ql;

    // Obstacles are upright cylinders; a touch is a crash.
    for (const o of obstacles) {
      const dx = s.p[0] - o.x, dz = s.p[2] - o.z, dl = Math.hypot(dx, dz), rr = o.r + .65;
      if (dl < rr && s.p[1] < o.h) {
        const nx = dx / (dl || 1), nz = dz / (dl || 1), vn = s.v[0] * nx + s.v[2] * nz;
        s.p[0] = o.x + nx * rr; s.p[2] = o.z + nz * rr;
        if (vn < 0) { s.v[0] -= 1.4 * vn * nx; s.v[2] -= 1.4 * vn * nz; }
        if (Math.hypot(s.v[0], s.v[2]) > .5 || Math.abs(vn) > .3) crash();
      }
    }

    // Boxes: the roof is ground; a side below the roof is a wall.
    for (const b of boxes) {
      const dx = s.p[0] - b.x, dz = s.p[2] - b.z, ex = b.hx + .55, ez = b.hz + .55;
      if (Math.abs(dx) >= ex || Math.abs(dz) >= ez || s.p[1] >= b.h + rest - .08) continue;
      const ax = ex - Math.abs(dx) < ez - Math.abs(dz) ? 0 : 2, nrm = Math.sign(ax ? dz : dx) || 1;
      s.p[ax] = (ax ? b.z : b.x) + nrm * (ax ? ez : ex);
      const vn = s.v[ax] * nrm;
      if (vn < 0) s.v[ax] -= 1.4 * vn * nrm;
      if (Math.hypot(s.v[0], s.v[2]) > .5 || Math.abs(vn) > .3) crash();
    }

    const e = euler(s.q);
    s.landed = feetDown >= 3 && Math.hypot(...s.v) < .6 && Math.hypot(...s.w) < .8;
    if (feetDown + 0 > 0 && Math.acos(clamp(up[1], -1, 1)) > P.crash.tilt) crash();
    s.tiltDeg = Math.acos(clamp(up[1], -1, 1)) / DEG;
    s.euler = e;
  }

  return {
    s, P, tMax, rest,
    step(dt) {
      s.acc = Math.min(s.acc + dt, 8 * H);
      while (s.acc >= H) { sub(H); s.acc -= H; }
    },
    reset(x = 0, z = 0, yaw = 0) {
      s.p = [x, rest + ground(x, z), z]; s.v = [0, 0, 0]; s.q = yawQuat(yaw); s.w = [0, 0, 0];
      s.f.fill(0); s.cmd.fill(0); s.thrust.fill(0);
      s.armed = false; s.crashed = false; s.landed = true; s.quietFor = 0; s.impact = 0;
      resetLoops();
    },
    telemetry() {
      const e = euler(s.q);
      return {
        agl: s.p[1] - rest - ground(s.p[0], s.p[2]),
        speed: Math.hypot(s.v[0], s.v[1], s.v[2]),
        ground: Math.hypot(s.v[0], s.v[2]),
        vs: s.v[1],
        hdg: ((90 - e.yaw / DEG) % 360 + 360) % 360,
        roll: e.roll / DEG, pitch: e.pitch / DEG,
        rpm: Array.from(s.f, f => Math.sqrt(f) * P.rpmMax),
        load: s.thrust.reduce((t, x) => t + x, 0) / (m * G),
        wind: Math.hypot(s.wind[0], s.wind[2])
      };
    }
  };
}
