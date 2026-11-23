// Superconductor track: the puck, its lock, its warmth, the pour and the beads.
// Units are metres and seconds. The ring lies flat, centred on the origin, y up.

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const G = 9.81;

// The ring: two rows of magnets on a low base, a steel strip between them.
export const TRACK = { r: 0.17, width: 0.028, base: 0.007, mag: 0.008, baseW: 0.036 };
export const TOP = TRACK.base + TRACK.mag;
// The puck: a wrapped disc of YBCO on sapphire.
export const PUCK = { r: 0.033, t: 0.005 };
// Pinned height range, in metres over the magnets.
export const HMIN = 0.004, HMAX = 0.026;

// The lock: a stiff spring to the pinned pose, lightly damped.
const W0 = TAU * 7, ZETA = 0.12;
// The tilt springs are a little softer than the height spring.
const WT = TAU * 5.5, ZT = 0.14;
// Along the loop the field does not change, so only slow drag acts.
const GLIDE_TAU = 40;
// A warm puck on the steel slides with friction.
const MU = 0.32;
// Loop time from a pour until the puck drops.
export const WARM_S = 52;
const VMAX = 1.8;

export function makeSim() {
  return {
    t: 0,
    th: 1.83, om: 0,
    h: 0.012, hv: 0, rx: 0, rxv: 0, rz: 0, rzv: 0, lat: 0, latv: 0,
    pin: { h: 0.012, rx: 0, rz: 0 },
    warm: 0, landed: false, calm: false,
    held: null,
    pour: null,
    beads: [],
    events: [],
    acc: 0,
  };
}

// Lock strength: 1 when cold, 0 past the critical warmth.
export const lock = s => 1 - smooth(0.74, 1, s.warm);
// Frost cover: full when cold, gone as the puck warms.
export const frost = s => 1 - smooth(0.28, 0.92, s.warm);
// Boil-off: how hard the fog pours off the puck.
export const boil = s => 1 - smooth(0.5, 0.97, s.warm);

// The puck's centre and its frame on the loop.
export function pose(s) {
  const rr = TRACK.r + s.lat;
  const c = Math.cos(s.th), n = Math.sin(s.th);
  return { x: c * rr, y: TOP + s.h + PUCK.t / 2, z: n * rr, c, n };
}

// The lowest rim point lies this far under the centre's base.
const rimDrop = (rx, rz) => PUCK.r * Math.sin(Math.min(1.2, Math.hypot(rx, rz)));

/* ---------- gestures ---------- */
// A push drag: the puck's angle follows the pointer's angle on the loop.
export function grab(s, th) { s.held = { mode: 'push', th }; s.events.push({ type: 'grab' }); }
export function aim(s, th) { if (s.held) s.held.th = th; }
// A hold: the pin follows the hand in small snaps.
export function hold(s) { s.held = { mode: 'pin', h: s.pin.h, rx: s.pin.rx, rz: s.pin.rz }; s.events.push({ type: 'grab' }); }
export function shape(s, h, rx, rz) {
  if (!s.held || s.held.mode !== 'pin') return;
  s.held.h = clamp(h, HMIN, HMAX);
  // A tilt keeps the lowest rim point clear of the magnets.
  const lim = 0.62;
  const m = Math.hypot(rx, rz);
  const k = m > lim ? lim / m : 1;
  s.held.rx = rx * k; s.held.rz = rz * k;
  const floor = rimDrop(s.held.rx, s.held.rz) + 0.0015;
  if (s.held.h < floor) s.held.h = floor;
}
export function letGo(s) {
  if (!s.held) return;
  s.held = null;
  s.events.push({ type: 'release' });
}
// A shove along the loop, in the way it already runs.
export function push(s) {
  const dir = Math.sign(s.om) || 1;
  s.om = clamp(s.om + dir * 0.75 / TRACK.r, -VMAX / TRACK.r, VMAX / TRACK.r);
  s.events.push({ type: 'push' });
}
// A pour of liquid nitrogen over the puck.
export function cool(s) {
  if (s.pour && s.pour.t < 0.4) return false;
  s.pour = { t: 0, dur: 1.15, beads: 0 };
  s.events.push({ type: 'pour' });
  return true;
}
// Sets the pinned height from the slider.
export function setHeight(s, h) {
  s.pin.h = clamp(h, Math.max(HMIN, rimDrop(s.pin.rx, s.pin.rz) + 0.0015), HMAX);
}

/* ---------- step ---------- */
const DT = 1 / 240;
export function step(s, dt) {
  s.acc = Math.min(s.acc + dt, 0.1);
  while (s.acc >= DT) { s.acc -= DT; sub(s, DT); }
  beadsStep(s, dt);
}

function sub(s, dt) {
  s.t += dt;
  const P = s.pour;
  if (P) {
    P.t += dt;
    // The stream lands after it falls; it chills the puck in a moment.
    if (P.t > 0.14 && P.t < P.dur) {
      s.warm = Math.max(0, s.warm - dt * 2.4);
      if (s.landed && s.warm < 0.6) { s.landed = false; s.pin.rx = 0; s.pin.rz = 0; s.events.push({ type: 'relock' }); }
    }
    if (P.t > P.dur + 0.4) s.pour = null;
  } else {
    s.warm = Math.min(1, s.warm + dt / WARM_S);
  }
  const L = s.landed ? 0 : lock(s);
  if (!s.landed && L <= 0) { s.landed = true; s.events.push({ type: 'unlock' }); }

  // The pin moves in snaps while held: flux lines let go a few at a time.
  const H = s.held;
  if (H && H.mode === 'pin' && !s.landed) {
    const dh = H.h - s.pin.h, dx = H.rx - s.pin.rx, dz = H.rz - s.pin.rz;
    if (Math.abs(dh) > 0.0011 || Math.hypot(dx, dz) > 0.035) {
      s.pin.h = H.h; s.pin.rx = H.rx; s.pin.rz = H.rz;
      s.events.push({ type: 'snap', k: clamp(Math.abs(dh) / 0.003 + Math.hypot(dx, dz) / 0.08) });
    }
  }

  /* along the loop */
  const v = s.om * TRACK.r;
  let at = 0;
  if (H && H.mode === 'push') {
    // A stiff follow, critically damped, toward the hand's angle.
    let d = H.th - s.th;
    d -= Math.round(d / TAU) * TAU;
    at = (d * 900 - s.om * 60) * TRACK.r;
  } else if (s.landed && s.h <= 0.0002) {
    // Sliding on the steel: kinetic friction stops it fast.
    const f = MU * G;
    at = -Math.sign(v) * Math.min(f, Math.abs(v) / dt);
    if (Math.abs(v) > 0.03 && Math.random() < dt * 40) s.events.push({ type: 'scrape', v: Math.abs(v) });
  } else {
    at = -v / GLIDE_TAU;
  }
  s.om += at / TRACK.r * dt;
  s.om = clamp(s.om, -VMAX / TRACK.r, VMAX / TRACK.r);
  s.th += s.om * dt;
  if (s.th > TAU) s.th -= TAU; else if (s.th < 0) s.th += TAU;
  s.at = at;

  /* height: the pinned spring, with a sag as the lock weakens */
  const w = W0 * Math.sqrt(L);
  const ac = (s.om * TRACK.r) ** 2 / TRACK.r;
  let ah = -w * w * (s.h - s.pin.h) - 2 * ZETA * w * s.hv - G + G * L;
  s.hv += ah * dt;
  s.h += s.hv * dt;

  /* tilt: the pinned tilt; a warm puck lies flat */
  const wt = WT * Math.sqrt(Math.max(L, s.landed ? 0 : 0.02));
  // Speed on the curve leans the puck out; a push rocks it along the track.
  const rxT = s.pin.rx * L + 0.012 * ac / G * L;
  const rzT = s.pin.rz * L - 0.02 * at / G * L;
  const kf = s.landed ? TAU * 9 : wt;
  s.rxv += (-kf * kf * (s.rx - rxT) - 2 * ZT * kf * s.rxv) * dt;
  s.rzv += (-kf * kf * (s.rz - rzT) - 2 * ZT * kf * s.rzv) * dt;
  s.rx += s.rxv * dt; s.rz += s.rzv * dt;

  /* side offset: the curve pushes it out against the pin */
  const wl = W0 * 0.9 * Math.sqrt(Math.max(L, 0.05));
  s.latv += (-wl * wl * s.lat - 2 * ZETA * wl * s.latv + ac * (L > 0 ? 1 : 0)) * dt;
  s.lat += s.latv * dt;
  if (s.landed) { s.lat *= 1 - dt * 6; s.latv *= 1 - dt * 6; }

  /* contact: the rim or the base meets the magnets */
  const floor = rimDrop(s.rx, s.rz);
  if (s.h > floor + 0.0008) s.touch = false;
  if (s.h < floor) {
    const vin = -s.hv;
    s.h = floor;
    // A first touch always sounds, however soft.
    if (vin > 0.04 || !s.touch) s.events.push({ type: 'clack', v: Math.max(vin, 0.06) });
    s.touch = true;
    s.hv = vin > 0.05 ? vin * 0.32 : 0;
    // The rim strike flattens the tilt.
    s.rxv *= 0.6; s.rzv *= 0.6;
  }
}

/* ---------- beads ---------- */
// Nitrogen beads skate on their own vapour: no friction, a soft bounce.
function floorAt(s, x, z) {
  const rad = Math.hypot(x, z);
  const p = pose(s);
  if (Math.hypot(x - p.x, z - p.z) < PUCK.r * 0.95 && !s.landed) return p.y + PUCK.t / 2;
  if (Math.abs(rad - TRACK.r) < TRACK.baseW / 2) return TOP;
  return 0;
}
function beadsStep(s, dt) {
  const P = s.pour;
  if (P && P.t > 0.14 && P.t < P.dur && !s.calm) {
    const want = Math.floor((P.t - 0.14) / (P.dur - 0.14) * 34);
    const p = pose(s);
    while (P.beads < want && s.beads.length < 48) {
      P.beads++;
      const a = Math.random() * TAU, sp = 0.1 + Math.random() * 0.32;
      s.beads.push({
        x: p.x + Math.cos(a) * 0.01, y: p.y + PUCK.t, z: p.z + Math.sin(a) * 0.01,
        vx: Math.cos(a) * sp + s.om * TRACK.r * -p.n * 0.5, vy: 0.15 + Math.random() * 0.4, vz: Math.sin(a) * sp + s.om * TRACK.r * p.c * 0.5,
        r: 0.0008 + Math.random() * 0.0018, r0: 0, life: 1.2 + Math.random() * 2.2, age: 0, hop: 0,
      });
      s.beads[s.beads.length - 1].r0 = s.beads[s.beads.length - 1].r;
    }
  }
  for (let i = s.beads.length - 1; i >= 0; i--) {
    const b = s.beads[i];
    b.age += dt;
    b.r = b.r0 * Math.sqrt(Math.max(0, 1 - b.age / b.life));
    b.vy -= G * dt;
    const ox = b.x, oz = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    let f = floorAt(s, b.x, b.z);
    // A bead that meets the side of the base bounces back off it.
    if (f > b.y + b.r + 0.002 && f - floorAt(s, ox, oz) > 0.002) {
      b.x = ox; b.z = oz;
      const rad = Math.hypot(b.x, b.z) || 1, nx = b.x / rad, nz = b.z / rad;
      const vn = b.vx * nx + b.vz * nz;
      b.vx -= 1.6 * vn * nx; b.vz -= 1.6 * vn * nz;
      f = floorAt(s, b.x, b.z);
    }
    if (b.y - b.r < f) {
      b.y = f + b.r;
      if (b.vy < -0.15) { s.events.push({ type: 'bead', v: -b.vy, x: b.x, y: b.y, z: b.z }); b.hop++; }
      b.vy = b.vy < -0.15 ? -b.vy * 0.35 : 0;
      // A thin film of vapour under the bead: almost no drag.
      b.vx *= 1 - dt * 1.1; b.vz *= 1 - dt * 1.1;
    }
    if (b.age >= b.life || Math.hypot(b.x, b.z) > 1.2) s.beads.splice(i, 1);
  }
}

// True while anything moves or a pour is in flight.
export function busy(s) {
  return !!s.held || !!s.pour || s.beads.length > 0
    || Math.abs(s.om) > 0.004
    || Math.abs(s.hv) > 0.0004 || Math.abs(s.rxv) > 0.004 || Math.abs(s.rzv) > 0.004 || Math.abs(s.latv) > 0.0004;
}
