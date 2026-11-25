// Star Chart: tidal disruption of stars dropped into a black hole or quasar (stimming-qhnp).
// Paczynski-Wiita orbital physics (after Event horizon) with Galaxy-style breakup streaks and sparks.
// Units: one Schwarzschild radius (GM = 0.5, ISCO at r = 3, tidal radius RT = 6.4).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GM = 0.5;
const SIM = 30;
const RT = 6.4;
const MAX_STARS = 3;
const PER = 1500;
const JET_CAP = 480;
export const TDE_STRIDE = 8;
export const MAX_TDE = MAX_STARS * (PER + 24) + JET_CAP;

// Pseudo-Newtonian pull gives an ISCO at r = 3 and rapid pericentre precession inside r = 10.
const pull = r => GM / ((r - 1) * (r - 1));
const vCirc = r => Math.sqrt(GM * r) / (r - 1);

/**
 * Creates the tidal-disruption particle pool for black holes and quasars.
 * Zero work runs while no star or jet particle is live.
 */
export function makeTde() {
  const N = MAX_STARS * PER;
  const S = {
    x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
    vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
    heat: new Float32Array(N), age: new Float32Array(N), seed: new Float32Array(N),
    size: new Float32Array(N), vr: new Float32Array(N),
    peri: new Uint8Array(N), on: new Uint8Array(N),
    // Polar jet sparks launched when a jetted hole (3C 273, Powehi) swallows gas.
    jx: new Float32Array(JET_CAP), jy: new Float32Array(JET_CAP), jz: new Float32Array(JET_CAP),
    jvx: new Float32Array(JET_CAP), jvy: new Float32Array(JET_CAP), jvz: new Float32Array(JET_CAP),
    jAge: new Float32Array(JET_CAP), jLife: new Float32Array(JET_CAP), jOn: new Uint8Array(JET_CAP),
    jCur: 0, jLive: 0,
    buf: new Float32Array(MAX_TDE * TDE_STRIDE),
    stars: [], events: [], flare: 0, live: 0,
  };
  return S;
}

/** Clears every star and particle on a star switch or reset. */
export function resetTde(S) {
  S.stars.length = 0;
  S.events.length = 0;
  S.on.fill(0);
  S.jOn.fill(0);
  S.jLive = 0;
  S.flare = 0;
  S.live = 0;
}

/**
 * Drops a new star into the hole's tilted disc plane at azimuth phi and radius r0.
 * Returns the star object, or null when three stars are already in flight.
 */
export function dropStar(S, phi, r0 = 15) {
  if (S.stars.length >= MAX_STARS) return null;
  const r = clamp(r0, 10.5, 19);
  // Eccentric prograde orbit whose pericentre plunges inside the tidal radius RT.
  const k = Math.sqrt(15 / r);
  const vt = 0.152 * k, vr = -0.142 * k;
  const c = Math.cos(phi), s = Math.sin(phi);
  const star = {
    x: r * c, y: (Math.random() - 0.5) * 0.4, z: r * s,
    vx: vr * c - vt * s, vy: 0, vz: vr * s + vt * c,
    age: 0, torn: false, gone: false, slot: -1, stretch: 1, tearAge: 0,
    // Slight colour tint: hot blue-white, golden, or warm orange infalling star.
    temp: 0.45 + Math.random() * 0.65,
  };
  S.stars.push(star);
  S.live = S.stars.length + (S.jLive > 0 ? 1 : 0);
  return star;
}

// Tears an infalling star into Galaxy-style clumpy stream particles and hot breakup sparks.
function tear(S, st) {
  let slot = 0;
  const used = new Set(S.stars.filter(o => o.slot >= 0).map(o => o.slot));
  while (used.has(slot)) slot++;
  st.slot = slot;
  st.torn = true;
  st.tearAge = 0;
  const r = Math.hypot(st.x, st.z) || 1;
  const rx = st.x / r, rz = st.z / r;
  const i0 = slot * PER;
  for (let k = 0; k < PER; k++) {
    const i = i0 + k;
    const spark = k < 160;
    const u = (k / (PER - 1)) * 2 - 1;
    // Near side sits deeper in the gravity well; far side flings into a tidal tail.
    const d = spark ? (Math.random() - 0.5) * 1.4 : u * 1.65 + (Math.random() - 0.5) * 0.12;
    const w = spark ? (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 0.36 * Math.sqrt(Math.max(0, 1 - u * u));
    const h = (Math.random() - 0.5) * (spark ? 0.8 : 0.28);
    S.x[i] = st.x + rx * d - rz * w;
    S.y[i] = st.y + h;
    S.z[i] = st.z + rz * d + rx * w;
    // Breakup burst: core sparks spray outward slightly; tidal stream keeps orbital shear.
    const burst = spark ? 0.065 : 0.009;
    const a = Math.random() * Math.PI * 2;
    S.vx[i] = st.vx * (1 + (Math.random() - 0.5) * 0.015) + Math.cos(a) * burst * Math.random();
    S.vy[i] = (Math.random() - 0.5) * (spark ? 0.055 : 0.014);
    S.vz[i] = st.vz * (1 + (Math.random() - 0.5) * 0.015) + Math.sin(a) * burst * Math.random();
    S.heat[i] = spark ? 2.4 + Math.random() * 1.6 : 0.35;
    S.age[i] = 0;
    S.peri[i] = 0;
    S.vr[i] = -1;
    S.on[i] = 1;
    // Clumpy luminous beads along the tidal spaghetti stream, as in Galaxy.
    S.seed[i] = (0.55 + 0.85 * Math.random()) * (spark ? 1.5 : 1 + 0.55 * Math.sin(u * 27 + st.age));
    S.size[i] = spark ? 0.65 + Math.random() * 0.9 : 0.55 + Math.random() * 0.85;
  }
  S.events.push({ kind: 'tear', x: st.x, z: st.z });
}

// Fires relativistic jet sparks along both spin poles when a jetted hole swallows debris.
function spawnJet(S, count) {
  for (let k = 0; k < count; k++) {
    const i = S.jCur;
    S.jCur = (S.jCur + 1) % JET_CAP;
    const sign = Math.random() < 0.72 ? 1 : -1;
    const a = Math.random() * Math.PI * 2;
    const rad = 0.2 + Math.random() * 0.65;
    const spd = 0.55 + Math.random() * 0.65;
    S.jx[i] = Math.cos(a) * rad;
    S.jy[i] = sign * (1.8 + Math.random() * 1.4);
    S.jz[i] = Math.sin(a) * rad;
    S.jvx[i] = Math.cos(a) * 0.045;
    S.jvy[i] = sign * spd;
    S.jvz[i] = Math.sin(a) * 0.045;
    S.jAge[i] = 0;
    S.jLife[i] = 28 + Math.random() * 34;
    S.jOn[i] = 1;
  }
}

/**
 * Advances infalling stars, tidal debris streams and jet sparks.
 * @param {object} S The TDE pool.
 * @param {number} realDt Real frame time in seconds.
 * @param {boolean} calm Reduced motion flag.
 * @param {boolean} hasJet True on jetted holes (3C 273, Powehi).
 */
export function stepTde(S, realDt, calm = false, hasJet = false) {
  S.events.length = 0;
  if (S.stars.length === 0 && S.jLive === 0) { S.live = 0; return; }
  const dt = Math.min(realDt, 1 / 20) * SIM * (calm ? 0.55 : 1);
  const sub = Math.max(1, Math.ceil(dt / 0.14));
  const h = dt / sub;
  let heatSum = 0, swallowed = 0;

  for (const st of S.stars) {
    st.age += dt;
    if (st.torn) { st.tearAge += dt; continue; }
    for (let j = 0; j < sub; j++) {
      const r = Math.hypot(st.x, st.y, st.z) || 1;
      const a = pull(Math.max(r, 1.3)) / r;
      st.vx -= st.x * a * h; st.vy -= st.y * a * h; st.vz -= st.z * a * h;
      st.x += st.vx * h; st.y += st.vy * h; st.z += st.vz * h;
    }
    const r = Math.hypot(st.x, st.z);
    st.stretch = 1 + 3.2 * Math.pow(RT / Math.max(r, RT * 0.7), 3);
    if (r < RT) tear(S, st);
  }

  for (const st of S.stars) {
    if (!st.torn || st.gone) continue;
    let alive = 0;
    const i0 = st.slot * PER, i1 = i0 + PER;
    for (let i = i0; i < i1; i++) {
      if (!S.on[i]) continue;
      let x = S.x[i], y = S.y[i], z = S.z[i];
      let vx = S.vx[i], vy = S.vy[i], vz = S.vz[i];
      let r = Math.hypot(x, z);
      for (let j = 0; j < sub; j++) {
        const rr = Math.max(Math.hypot(x, y, z), 1.05);
        const a = pull(rr) / rr;
        vx -= x * a * h; vy -= y * a * h; vz -= z * a * h;
        x += vx * h; y += vy * h; z += vz * h;
        r = Math.hypot(x, z);
      }
      const vr = (x * vx + z * vz) / Math.max(r, 1e-4);
      if (S.vr[i] < 0 && vr >= 0) S.peri[i] = Math.min(9, S.peri[i] + 1);
      S.vr[i] = vr;
      const p = S.peri[i];
      // Self-intersection shocks pull returning gas into a blazing circular accretion ring.
      if (p >= 1 && r > 1.6) {
        const k = p >= 2 ? 0.045 : 0.032;
        const vc = vCirc(Math.max(r, 3.05));
        const tx = -z / r, tz = x / r;
        const ex = tx * vc - vx, ez = tz * vc - vz;
        const f = 1 - Math.exp(-k * dt);
        vx += ex * f; vz += ez * f;
        vy *= Math.exp(-0.04 * dt);
        const q = (ex * ex + ez * ez) * f * f;
        S.heat[i] += q * 1600 * (p >= 2 ? 1 : 0.4) * (calm ? 0.55 : 1);
      }
      // Viscosity drains angular momentum so the glowing stream spirals into the horizon.
      if (p >= 1 && S.age[i] > 50) {
        const tx = -z / r, tz = x / r;
        const vt = vx * tx + vz * tz;
        const dv = vt * 0.0022 * dt;
        vx -= tx * dv; vz -= tz * dv;
      }
      S.heat[i] *= Math.exp(-dt / 22);
      S.age[i] += dt;
      if (r < 1.15) { S.on[i] = 0; swallowed++; continue; }
      if (r > 38 || S.age[i] > 950) { S.on[i] = 0; continue; }
      S.x[i] = x; S.y[i] = y; S.z[i] = z;
      S.vx[i] = vx; S.vy[i] = vy; S.vz[i] = vz;
      heatSum += S.heat[i];
      alive++;
    }
    if (alive < PER * 0.025 && st.tearAge > 520) { for (let i = i0; i < i1; i++) S.on[i] = 0; alive = 0; }
    if (alive === 0) st.gone = true;
  }
  S.stars = S.stars.filter(st => !st.gone);

  if (hasJet && swallowed > 0) spawnJet(S, Math.min(24, Math.ceil(swallowed * 0.85)));
  let jAlive = 0;
  for (let i = 0; i < JET_CAP; i++) {
    if (!S.jOn[i]) continue;
    S.jx[i] += S.jvx[i] * dt; S.jy[i] += S.jvy[i] * dt; S.jz[i] += S.jvz[i] * dt;
    S.jAge[i] += dt;
    if (S.jAge[i] >= S.jLife[i]) { S.jOn[i] = 0; continue; }
    jAlive++;
  }
  S.jLive = jAlive;
  const want = clamp(heatSum / PER + swallowed * 0.004, 0, calm ? 1.2 : 2.6);
  S.flare += (want - S.flare) * (1 - Math.exp(-dt / (want > S.flare ? 4 : 28)));
  S.live = S.stars.length + (jAlive > 0 ? 1 : 0);
}

/**
 * Packs intact stars, breakup particles and jet sparks into S.buf for instanced GPU draw.
 * Stride 8: [x, y, z, size, vx, vy, vz, intensity].
 * Negative size flags a polar jet spark (extra cool blue-white beaming).
 * @returns {number} Instance count.
 */
export function packTde(S, gain = 1) {
  let n = 0;
  const b = S.buf;
  const put = (x, y, z, sz, vx, vy, vz, I) => {
    if (n >= MAX_TDE) return;
    const o = n * TDE_STRIDE;
    b[o] = x; b[o + 1] = y; b[o + 2] = z; b[o + 3] = sz;
    b[o + 4] = vx; b[o + 5] = vy; b[o + 6] = vz; b[o + 7] = I;
    n++;
  };

  for (const st of S.stars) {
    if (!st.torn) {
      // Intact star: hot core plus tidally stretched envelope beads peeling along the radius.
      const r = Math.hypot(st.x, st.z) || 1;
      const rx = st.x / r, rz = st.z / r;
      put(st.x, st.y, st.z, 2.9, st.vx * 0.35, st.vy * 0.35, st.vz * 0.35, 2.8 * gain);
      const ext = 0.22 * st.stretch;
      for (let k = -8; k <= 8; k++) {
        if (k === 0) continue;
        const u = k / 8;
        const off = u * ext;
        const fade = Math.exp(-u * u * 2.2);
        put(st.x + rx * off, st.y, st.z + rz * off, 1.35 * (1 - 0.45 * Math.abs(u)), st.vx, st.vy, st.vz, 1.35 * fade * gain);
      }
      continue;
    }
    const i0 = st.slot * PER;
    const flash = Math.exp(-st.tearAge / 6);
    for (let i = i0; i < i0 + PER; i++) {
      if (!S.on[i]) continue;
      const r = Math.hypot(S.x[i], S.z[i]);
      const age = S.age[i];
      const warm = 0.78 * Math.exp(-age / 220) + 0.16;
      const hot = Math.min(S.heat[i], 7);
      const fade = clamp(age > 720 ? 1 - (age - 720) / 230 : 1, 0, 1) * clamp((r - 1.1) / 1.4, 0, 1);
      const I = (warm + hot * 0.24 + flash * 0.9) * S.seed[i] * fade * gain;
      if (I < 0.015) continue;
      put(S.x[i], S.y[i], S.z[i], S.size[i], S.vx[i], S.vy[i], S.vz[i], I);
    }
  }

  for (let i = 0; i < JET_CAP; i++) {
    if (!S.jOn[i]) continue;
    const u = S.jAge[i] / S.jLife[i];
    const fade = Math.min(1, u * 10) * Math.pow(1 - u, 1.8);
    put(S.jx[i], S.jy[i], S.jz[i], -(0.9 + 0.7 * (1 - u)), S.jvx[i], S.jvy[i], S.jvz[i], 1.8 * fade * gain);
  }
  return n;
}
