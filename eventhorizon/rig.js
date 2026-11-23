// Event horizon: the camera on its orbit, and the star that falls in.
// Units: one Schwarzschild radius; GM = 0.5; light speed 1.
// The star's gas moves in a Paczynski-Wiita potential, in the disc plane.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const GM = 0.5;
// Sim time units per second of real time.
export const SIM = 34;
// The disc pattern turns slower than the gas, so the idle disc reads calm.
export const DISC_RATE = 7;
// The tidal radius: the star tears here.
export const RT = 6.4;
export const STAR_R = 0.34;
// Particles per star; three stars may be in flight.
export const PER = 3000, CAP = PER * 3;

/* ---------- camera ---------- */
// An orbit round the hole. yaw and pitch in radians; dist in radii.
export function makeCamera() {
  const cam = { yaw: 0, pitch: 0, dist: 30, pos: [0, 0, 30], rot: new Float32Array(9), lens: [0.5, 0.3, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], w: 1, h: 1, top: 0, bottom: 0 };
  cam.fit = (w, h, top = 0, bottom = 0) => {
    cam.w = w; cam.h = h; cam.top = top; cam.bottom = bottom;
    cam.place();
  };
  cam.place = () => {
    const { w, h, top, bottom } = cam;
    const asp = w / h;
    const free = Math.max(0.4, (h - top - bottom) / h);
    // The disc fills about 80% of a wide stage; a tall stage crops the disc's rim.
    const fill = asp < 0.8 ? 1.45 : asp < 1.2 ? 1.05 : 0.8;
    const tanX = 14.5 / 30 / fill;
    const tanY = Math.max(tanX / asp, 0.26 / free);
    cam.lens = [tanY * asp, tanY, (bottom - top) / h];
    const cp = Math.cos(cam.pitch);
    cam.pos = [cam.dist * cp * Math.sin(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.dist * cp * Math.cos(cam.yaw)];
    const back = norm(cam.pos);
    const right = norm(cross([0, 1, 0], back));
    const up = cross(back, right);
    cam.right = right; cam.up = up; cam.back = back;
    cam.rot.set([...right, ...up, ...back]);
  };
  // A world point to stage CSS pixels, without the bend; null behind the camera.
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
    return norm([0, 1, 2].map(i => cam.right[i] * a + cam.up[i] * b - cam.back[i]));
  };
  return cam;
}

/* ---------- the star and its stream ---------- */
// Pseudo-Newtonian pull: it gives the ISCO at r = 3 and fast precession inside 10.
const pull = r => GM / ((r - 1) * (r - 1));
const vCirc = r => Math.sqrt(GM * r) / (r - 1);

export function makeStream() {
  const S = {
    x: new Float32Array(CAP), z: new Float32Array(CAP), vx: new Float32Array(CAP), vz: new Float32Array(CAP),
    heat: new Float32Array(CAP), age: new Float32Array(CAP), seed: new Float32Array(CAP),
    peri: new Uint8Array(CAP), vr: new Float32Array(CAP), on: new Uint8Array(CAP),
    buf: new Float32Array(CAP * 4),
    stars: [], live: 0, flare: 0, swallow: 0, events: [],
  };
  return S;
}

// A new star at angle phi, falling in on a prograde orbit.
export function launch(S, phi) {
  if (S.stars.length >= 3) return null;
  const r0 = 15;
  // Bound, with its pericentre inside the tidal radius.
  const vt = 0.153, vr = -0.14;
  const c = Math.cos(phi), s = Math.sin(phi);
  // Radial in, plus the prograde turn.
  const star = { x: r0 * c, z: r0 * s, vx: vr * c - vt * s, vz: vr * s + vt * c, age: 0, torn: false, gone: false, slot: -1, stretch: 1, dirx: c, dirz: s, tearAge: 0 };
  S.stars.push(star);
  return star;
}

// Tears a star into PER particles in its own slot of the pool.
function tear(S, st) {
  let slot = 0;
  const used = new Set(S.stars.filter(o => o.slot >= 0).map(o => o.slot));
  while (used.has(slot)) slot++;
  st.slot = slot; st.torn = true; st.tearAge = 0;
  const r = Math.hypot(st.x, st.z);
  const rx = st.x / r, rz = st.z / r;
  for (let k = 0; k < PER; k++) {
    const i = slot * PER + k;
    // Spread along the radius: the near side sits deeper in the well.
    const u = (k / (PER - 1)) * 2 - 1;
    const d = u * 1.5 + (Math.random() - 0.5) * 0.08;
    const t = (Math.random() - 0.5) * 0.3 * Math.sqrt(1 - u * u);
    S.x[i] = st.x + rx * d - rz * t;
    S.z[i] = st.z + rz * d + rx * t;
    S.vx[i] = st.vx * (1 + (Math.random() - 0.5) * 0.004);
    S.vz[i] = st.vz * (1 + (Math.random() - 0.5) * 0.004);
    S.heat[i] = 0; S.age[i] = 0; S.peri[i] = 0; S.vr[i] = -1; S.on[i] = 1;
    // Beads along the stream, and a little scatter.
    S.seed[i] = (0.55 + 0.7 * Math.random()) * (1 + 0.45 * Math.sin(u * 23 + st.age));
  }
  S.events.push({ kind: 'tear', x: st.x, z: st.z });
}

// Steps the stars and the gas by dt sim units. calm softens the flare.
export function stepStream(S, dt, calm = false) {
  const sub = Math.max(1, Math.ceil(dt / 0.12));
  const h = dt / sub;
  let heatSum = 0, swallowed = 0;
  for (const st of S.stars) {
    st.age += dt;
    if (st.torn) { st.tearAge += dt; continue; }
    for (let j = 0; j < sub; j++) {
      const r = Math.hypot(st.x, st.z), a = pull(r) / r;
      st.vx -= st.x * a * h; st.vz -= st.z * a * h;
      st.x += st.vx * h; st.z += st.vz * h;
    }
    const r = Math.hypot(st.x, st.z);
    st.dirx = st.x / r; st.dirz = st.z / r;
    // Tides stretch the star along the radius as it nears.
    st.stretch = 1 + 3 * Math.pow(RT / r, 3);
    if (r < RT) tear(S, st);
  }
  for (const st of S.stars) {
    if (!st.torn || st.gone) continue;
    let alive = 0;
    const i0 = st.slot * PER, i1 = i0 + PER;
    for (let i = i0; i < i1; i++) {
      if (!S.on[i]) continue;
      let x = S.x[i], z = S.z[i], vx = S.vx[i], vz = S.vz[i];
      let r = Math.hypot(x, z);
      for (let j = 0; j < sub; j++) {
        const a = pull(r) / r;
        vx -= x * a * h; vz -= z * a * h;
        x += vx * h; z += vz * h;
        r = Math.hypot(x, z);
      }
      // A pericentre passage: radial speed turns from in to out.
      const vr = (x * vx + z * vz) / r;
      if (S.vr[i] < 0 && vr >= 0) S.peri[i] = Math.min(9, S.peri[i] + 1);
      S.vr[i] = vr;
      const p = S.peri[i];
      // Returning gas meets the stream: shocks pull it toward a circle and heat it.
      if (p >= 1 && r > 1.6) {
        const k = p >= 2 ? 0.04 : 0.03;
        const vc = vCirc(Math.max(r, 3.05));
        const tx = -z / r, tz = x / r;
        const ex = tx * vc - vx, ez = tz * vc - vz;
        const f = 1 - Math.exp(-k * dt);
        vx += ex * f; vz += ez * f;
        const q = (ex * ex + ez * ez) * f * f;
        S.heat[i] += q * 1400 * (p >= 2 ? 1 : 0.35) * (calm ? 0.5 : 1);
      }
      if (p >= 1 && S.age[i] > 60) {
        // Viscosity drains angular momentum: the ring creeps in.
        const tx = -z / r, tz = x / r;
        const vt = vx * tx + vz * tz;
        const dv = vt * 0.0019 * dt;
        vx -= tx * dv; vz -= tz * dv;
      }
      S.heat[i] *= Math.exp(-dt / 22);
      S.age[i] += dt;
      if (r < 1.12) { S.on[i] = 0; swallowed++; continue; }
      if (r > 34) { S.on[i] = 0; continue; }
      S.x[i] = x; S.z[i] = z; S.vx[i] = vx; S.vz[i] = vz;
      heatSum += S.heat[i];
      alive++;
    }
    // The last of the gas fades out over the disc.
    if (alive < PER * 0.02 && st.tearAge > 600) { for (let i = i0; i < i1; i++) S.on[i] = 0; alive = 0; }
    if (alive === 0) st.gone = true;
  }
  S.stars = S.stars.filter(st => !st.gone);
  // The flare follows the heat and the gas that falls through.
  const want = clamp(heatSum / PER + swallowed * 0.003, 0, calm ? 1.2 : 2.5);
  S.flare += (want - S.flare) * (1 - Math.exp(-dt / (want > S.flare ? 4 : 30)));
  S.swallow = swallowed;
  S.live = S.stars.length;
}

// Packs live particles: x, z, light, temperature in kK.
// Returns the count.
export function packStream(S, gain = 1) {
  let n = 0;
  const b = S.buf;
  for (const st of S.stars) {
    if (!st.torn) continue;
    const i0 = st.slot * PER;
    const fadeIn = clamp(st.tearAge / 3, 0, 1);
    for (let i = i0; i < i0 + PER; i++) {
      if (!S.on[i]) continue;
      const r = Math.hypot(S.x[i], S.z[i]);
      // Fresh gas glows from tidal squeeze; shocked gas glows from its heat.
      const age = S.age[i];
      const warm = 0.7 * Math.exp(-age / 200) + 0.18;
      const hot = Math.min(S.heat[i], 8);
      const fade = clamp((age > 900 ? 1 - (age - 900) / 300 : 1), 0, 1) * clamp((r - 1.1) / 1.5, 0, 1);
      const I = (warm + hot * 0.16) * S.seed[i] * fade * gain * (0.4 + 0.6 * fadeIn);
      if (I < 0.002) continue;
      b[n * 4] = S.x[i]; b[n * 4 + 1] = S.z[i];
      b[n * 4 + 2] = I;
      b[n * 4 + 3] = 7.5 + 3.5 * Math.min(hot, 3) + 4 * Math.exp(-age / 80);
      n++;
    }
  }
  return n;
}

export { clamp };
