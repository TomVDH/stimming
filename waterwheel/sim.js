// Water wheel sim: the race layout, water particles, buckets and wheel motion.
// Units are metres and seconds. World y points up.

const G = 9.81;
// One particle carries one unit of water.
const PCAP = 3200, SCAP = 700;
// Clearances in the race: trough under a rim, lip over a top, chute drop.
const TROUGH = 0.2, LIP = 0.2, DROP = 0.34;
const RADII = [1.45, 1.15, 0.9];

/* ---------- layout ---------- */
// Wide stage: a staircase down to the right. Tall stage: a zigzag down.
// room is the free stage in CSS pixels: { w, h, top }.
export function layout(room) {
  const tall = room.w / room.h < 0.95;
  const wheels = [];
  let cx = 0, cy = 0, dir = 1;
  RADII.forEach((R, i) => {
    if (i > 0) {
      const prev = wheels[i - 1];
      dir = tall ? -prev.dir : prev.dir;
      const trough = prev.cy - prev.R - TROUGH;
      cy = trough - DROP - LIP - R;
      cx = tall ? prev.cx - prev.dir * (0.25 * prev.R + 0.25 * R) : prev.cx + prev.R + R + 0.55;
    }
    const n = Math.max(12, Math.round((2 * Math.PI * R) / 0.42));
    wheels.push({ cx, cy, R, D: 0.26 * R, dir, n, arms: R > 1 ? 8 : 6 });
  });
  // The lip of each feed sits just before the top, on the side the water comes from.
  const lip = w => [w.cx - w.dir * 0.12 * w.R, w.cy + w.R + LIP];
  const last = wheels[wheels.length - 1];
  const x0 = Math.min(...wheels.map(w => w.cx - w.R)) - 0.9, x1 = Math.max(...wheels.map(w => w.cx + w.R)) + 0.9;
  const y1 = wheels[0].cy + wheels[0].R + LIP + 0.75, y0 = last.cy - last.R - TROUGH - 0.45;

  // Fit the box into the free stage; the spare room is landscape.
  const s = Math.min(room.w / (x1 - x0), room.h / (y1 - y0));
  const ox = room.w / 2 - ((x0 + x1) / 2) * s, oy = room.top + room.h / 2 + ((y0 + y1) / 2) * s;
  const view = { s, ox, oy };
  const left = -ox / s, right = (room.w - ox) / s, top = oy / s, bottom = -(room.H - oy) / s;

  // Floors: the head flume, then one trough and chute under each wheel.
  // A floor runs from its end wall to its open lip.
  const floors = [];
  const [hx, hy] = lip(wheels[0]);
  const headFrom = Math.min(left - 0.5, hx - 2.5);
  floors.push({ pts: [[headFrom, hy + 0.06 * (hx - headFrom) / 3], [hx, hy]], head: true });
  wheels.forEach((w, i) => {
    const next = wheels[i + 1];
    const ty = w.cy - w.R - TROUGH;
    const flow = next ? next.dir : w.dir;
    const wallX = w.cx - flow * 1.15 * w.R;
    if (next) {
      const [nx, ny] = lip(next);
      // A flat run under the wheel, then a chute down to the next lip.
      const knee = w.cx + flow * 0.95 * w.R;
      // The last half metre runs level, so the jet leaves the lip slow.
      const run = [nx - flow * 0.55, ny + 0.03];
      const pts = Math.abs(run[0] - wallX) > Math.abs(knee - wallX) + 0.3
        ? [[wallX, ty], [knee, ty - 0.04], run, [nx, ny]]
        : [[wallX, ty], run, [nx, ny]];
      floors.push({ pts, wheel: i });
    } else {
      // The tail race runs off the stage.
      const end = flow > 0 ? right + 1 : left - 1;
      floors.push({ pts: [[wallX, ty], [end, ty - 0.05 * Math.abs(end - wallX)]], wheel: i, tail: true });
    }
  });
  floors.forEach(f => {
    f.segs = [];
    for (let k = 0; k < f.pts.length - 1; k++) {
      const [ax, ay] = f.pts[k], [bx, by] = f.pts[k + 1];
      const len = Math.hypot(bx - ax, by - ay);
      f.segs.push({ ax, ay, bx, by, lo: Math.min(ax, bx), hi: Math.max(ax, bx), tx: (bx - ax) / len, ty: (by - ay) / len, len });
    }
    f.wallX = f.pts[0][0];
    f.wallY = f.pts[0][1];
    f.flow = Math.sign(f.pts[1][0] - f.pts[0][0]);
  });
  return { wheels, floors, view, tall, box: { x0, x1, y0, y1 }, edge: { left, right, top, bottom }, headX: (headFrom + hx) / 2 };
}

/* ---------- state ---------- */
export function makeSim() {
  const P = { n: 0, x: new Float32Array(PCAP), y: new Float32Array(PCAP), vx: new Float32Array(PCAP), vy: new Float32Array(PCAP), lift: new Float32Array(PCAP), age: new Float32Array(PCAP), foam: new Float32Array(PCAP), floor: new Int8Array(PCAP) };
  const S = { n: 0, x: new Float32Array(SCAP), y: new Float32Array(SCAP), vx: new Float32Array(SCAP), vy: new Float32Array(SCAP), life: new Float32Array(SCAP), k: new Float32Array(SCAP) };
  const sim = {
    P, S, L: null, wheels: [], maxP: PCAP,
    // The pour: where it falls, how hard, and the gate that eases it.
    pour: { x: 0, on: false, gate: 0, rate: 230, acc: 0 },
    // Events for the sound: landings and arm knocks, read once per frame.
    ev: { splash: [], spill: [], knock: [], flume: 0 },
    // Bucket capacity in units at full hold, for a wheel of radius 1.
    C: 58,
    setLayout(L) {
      const old = sim.wheels;
      // A new view keeps the water; a new shape of race clears it.
      const same = sim.L && sim.L.tall === L.tall;
      sim.L = L;
      // Wheels keep their turn and their water across a new layout.
      sim.wheels = L.wheels.map((w, i) => {
        const o = old[i];
        const fill = o && o.n === w.n ? o.fill : new Float32Array(w.n);
        const I0 = 3300 * w.R ** 3;
        return { ...w, ang: o ? o.ang : 0.13 * i, w: o ? o.w : 0, fill, spillAcc: new Float32Array(w.n), I0, wet: o ? o.wet : 0, armT: 0 };
      });
      if (!same) { P.n = 0; S.n = 0; }
    },
    step,
    busy() {
      return P.n > 0 || S.n > 0 || sim.pour.gate > 0.001 || sim.wheels.some(w => Math.abs(w.w) > 0 || w.fill.some((f, k) => f > sim.cap(w, k) + 0.02));
    },
    clear() { P.n = 0; S.n = 0; sim.wheels.forEach(w => { w.fill.fill(0); w.w = 0; w.wet = 0; }); },
  };

  const wrap = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  // The angle of bucket k from the top, toward the loaded side.
  function phiOf(w, k) { return wrap(w.dir * (((k + 0.5) / w.n) * 2 * Math.PI + w.ang)); }
  // Capacity: full from just before the top to past horizontal; none on the rising side.
  function cap(w, phi) {
    const a = Math.min(1, Math.max(0, (phi + 0.75) / 0.45));
    const b = 1 - Math.min(1, Math.max(0, (phi - 1.05) / 1.6));
    return sim.C * w.R * w.R * a * b;
  }
  sim.cap = (w, k) => cap(w, phiOf(w, k));
  sim.phiOf = phiOf;

  function spray(x, y, vx, vy, n, k = 1) {
    for (let i = 0; i < n && S.n < SCAP; i++) {
      const j = S.n++;
      const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random()) * k;
      S.x[j] = x; S.y[j] = y;
      S.vx[j] = vx * 0.3 + Math.cos(a) * sp; S.vy[j] = Math.abs(vy) * 0.25 + Math.abs(Math.sin(a)) * sp * 1.3;
      S.life[j] = 0.35 + Math.random() * 0.5; S.k[j] = 0.5 + Math.random() * 0.5;
    }
  }
  function add(x, y, vx, vy, foam = 0) {
    if (P.n >= sim.maxP) return -1;
    const j = P.n++;
    P.x[j] = x; P.y[j] = y; P.vx[j] = vx; P.vy[j] = vy;
    P.lift[j] = Math.random() * 0.07; P.age[j] = 0; P.foam[j] = foam; P.floor[j] = -1;
    return j;
  }
  function kill(j) {
    const l = --P.n;
    P.x[j] = P.x[l]; P.y[j] = P.y[l]; P.vx[j] = P.vx[l]; P.vy[j] = P.vy[l];
    P.lift[j] = P.lift[l]; P.age[j] = P.age[l]; P.foam[j] = P.foam[l]; P.floor[j] = P.floor[l];
  }

  function step(dt, { calm = false } = {}) {
    const L = sim.L;
    if (!L || dt <= 0) return;
    const ev = sim.ev;
    const sub = dt > 1 / 50 ? 2 : 1, h = dt / sub;
    // The pour gate eases open and shut, so a tap still makes a slug.
    const p = sim.pour;
    p.gate += ((p.on ? 1 : 0) - p.gate) * (1 - Math.exp(-dt / (p.on ? 0.12 : 0.18)));
    if (p.gate < 0.002 && !p.on) p.gate = 0;
    p.acc += p.rate * p.gate * dt;
    while (p.acc >= 1) {
      p.acc -= 1;
      const r = (Math.random() - 0.5) * 0.09 * (0.5 + p.gate);
      add(p.x + r, L.edge.top + 0.1 + Math.random() * 0.4, (Math.random() - 0.5) * 0.15, -1.6 - Math.random() * 0.3);
    }
    for (let s = 0; s < sub; s++) {
      particles(h, ev);
      wheels(h, ev);
    }
    sprays(dt, calm);
  }

  function particles(h, ev) {
    const L = sim.L, E = L.edge;
    let flume = 0;
    for (let j = P.n - 1; j >= 0; j--) {
      let x = P.x[j], y = P.y[j], vx = P.vx[j], vy = P.vy[j];
      vy -= G * h;
      x += vx * h; y += vy * h;
      P.foam[j] = Math.max(0, P.foam[j] - h * 1.6);
      // Water caught in a corner for long is gone.
      if ((P.age[j] += h) > 30) { kill(j); continue; }
      let on = -1;
      // Floors: one-sided, from above only.
      for (let f = 0; f < L.floors.length; f++) {
        const F = L.floors[f];
        for (const sg of F.segs) {
          if (x < sg.lo || x > sg.hi) continue;
          const yf = sg.ay + (sg.by - sg.ay) * ((x - sg.ax) / (sg.bx - sg.ax)) + P.lift[j];
          if (y < yf && y > yf - 0.3) {
            // The normal part of the speed goes; a hard hit throws spray.
            const vt = vx * sg.tx + vy * sg.ty;
            const vn = vx * -sg.ty + vy * sg.tx;
            if (vn < -2.2) { ev.splash.push([x, -vn]); spray(x, yf, vx, vn, Math.min(3, (-vn - 2) * 0.8 | 0), 0.8); P.foam[j] = Math.min(1, P.foam[j] + 0.5); }
            // Water runs down the flume at a steady speed; a steep chute runs faster.
            const goal = 1.4 + 4 * Math.max(0, -sg.ty);
            const vr = vt + (goal - vt) * (1 - Math.exp(-h * 5));
            vx = sg.tx * vr; vy = sg.ty * vr;
            y = yf;
            on = f;
          }
        }
        // The end wall turns water back.
        if (F.flow > 0 ? x < F.wallX : x > F.wallX) {
          if (y < F.wallY + 0.3 && y > F.wallY - 0.3) { x = F.wallX + F.flow * 0.01; vx = -vx * 0.3; }
        }
      }
      if (on >= 0) flume++;
      P.floor[j] = on;
      // Wheels: a bucket with room takes the water; the rest bounces off.
      for (const w of sim.wheels) {
        const dx = x - w.cx, dy = y - w.cy, r2 = dx * dx + dy * dy, R = w.R + 0.02;
        if (r2 > R * R) continue;
        const r = Math.sqrt(r2), th = Math.atan2(dx, dy);
        const lean = w.dir * 0.45 * (2 * Math.PI / w.n) * Math.max(0, Math.min(1, (r - w.R + w.D) / w.D));
        let k = Math.floor((((th - w.ang + lean) / (2 * Math.PI)) % 1 + 1) % 1 * w.n);
        if (k >= w.n) k = 0;
        if (r > w.R - w.D - 0.05 && w.fill[k] < sim.cap(w, k) - 0.5) {
          w.fill[k] += 1;
          // Landing water pushes the rim: a part of its momentum turns the wheel.
          w.w -= 0.35 * (dx * vy - dy * vx) / inertia(w);
          w.wet = 1;
          if (Math.random() < 0.15) ev.splash.push([x, Math.hypot(vx, vy) * 0.6]);
          if (Math.random() < 0.25) spray(x, y, vx, vy, 1, 0.5);
          kill(j);
          x = NaN;
          break;
        }
        // Off the rim: out to the surface, with the rim's own speed.
        const nx = dx / (r || 1), ny = dy / (r || 1);
        const vr = vx * nx + vy * ny;
        x = w.cx + nx * R; y = w.cy + ny * R;
        const ux = ny * w.w * w.R, uy = -nx * w.w * w.R;
        if (vr < 0) { vx -= 1.25 * vr * nx; vy -= 1.25 * vr * ny; }
        vx += (ux - vx) * 0.3; vy += (uy - vy) * 0.3;
        if (vr < -2) { spray(x, y, vx, vy, 2, 0.7); P.foam[j] = 1; }
      }
      if (Number.isNaN(x)) continue;
      // Water that leaves the stage is gone.
      if (y < E.bottom - 0.5 || x < E.left - 1.5 || x > E.right + 1.5) { if (y < E.bottom - 0.5) ev.splash.push([x, 0.3]); kill(j); continue; }
      P.x[j] = x; P.y[j] = y; P.vx[j] = vx; P.vy[j] = vy;
    }
    ev.flume = flume;
  }

  function inertia(w) {
    let m = 0;
    for (let k = 0; k < w.n; k++) m += w.fill[k];
    const rm = w.R - w.D / 2;
    return w.I0 + m * rm * rm;
  }

  function wheels(h, ev) {
    for (const w of sim.wheels) {
      const rm = w.R - w.D / 2, step = (2 * Math.PI) / w.n;
      let tq = 0;
      for (let k = 0; k < w.n; k++) {
        const f = w.fill[k];
        if (f <= 0) continue;
        const a = (k + 0.5) * step + w.ang;
        // Weight on the right turns the wheel clockwise: positive.
        tq += f * G * rm * Math.sin(a);
        const c = sim.cap(w, k);
        if (f > c) {
          // A bucket past its hold pours out at its mouth.
          const out = Math.min(f - c, (40 + 20 * (f - c)) * h);
          w.fill[k] = f - out;
          w.spillAcc[k] += out;
          while (w.spillAcc[k] >= 1) {
            w.spillAcc[k] -= 1;
            const aa = a + w.dir * step * (0.2 + 0.5 * Math.random());
            const sx = Math.sin(aa), sy = Math.cos(aa), R = w.R + 0.03;
            const j = add(w.cx + sx * R, w.cy + sy * R, sy * w.w * w.R + sx * 0.5, -sx * w.w * w.R + sy * 0.5 - 0.3, 0.4);
            if (j >= 0 && Math.random() < 0.08) ev.spill.push([w.cx + sx * R, 1]);
          }
        }
        if (w.fill[k] < 0.02) w.fill[k] = 0;
      }
      const I = inertia(w);
      // Friction: a viscous part, and a dry part that holds a slow wheel.
      const b = 1500 * w.R ** 2, c = 150 * w.R;
      let acc = (tq - b * w.w) / I;
      const was = w.w;
      w.w += acc * h;
      const dry = (c / I) * h;
      if (Math.abs(w.w) <= dry && Math.abs(tq) < c) w.w = 0;
      else w.w -= Math.sign(w.w) * dry;
      if (Math.sign(w.w) !== Math.sign(was) && was !== 0 && Math.abs(tq) < c) w.w = 0;
      const prev = w.ang;
      w.ang += w.w * h;
      // An arm that passes the top knocks: the sound reads it.
      const armStep = (2 * Math.PI) / w.arms;
      if (Math.floor(prev / armStep) !== Math.floor(w.ang / armStep)) ev.knock.push([w.cx, Math.abs(w.w), w.R]);
      w.wet = Math.max(0, w.wet - h / 90);
    }
  }

  function sprays(dt, calm) {
    for (let j = S.n - 1; j >= 0; j--) {
      S.life[j] -= dt;
      if (S.life[j] <= 0) { const l = --S.n; S.x[j] = S.x[l]; S.y[j] = S.y[l]; S.vx[j] = S.vx[l]; S.vy[j] = S.vy[l]; S.life[j] = S.life[l]; S.k[j] = S.k[l]; continue; }
      S.vy[j] -= G * 0.7 * dt;
      const air = Math.exp(-dt * (calm ? 6 : 2.5));
      S.vx[j] *= air; S.vy[j] *= air;
      S.x[j] += S.vx[j] * dt; S.y[j] += S.vy[j] * dt;
    }
  }

  return sim;
}
