// Glowing tide: the surf as a list of crest lines, and the camera.
// Each wave runs in, shoals, breaks, runs up the sand as swash and slides back.
// Distances are metres from the camera along the beach normal.

export const NW = 8;
export const CAM_H = 1.5;
// The still-water line and where waves are born.
export const SHORE = 8.6;
const SPAWN = 82;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const jit = k => 1 + (Math.random() * 2 - 1) * k;

/* ---------- camera ---------- */
// The camera stands on the beach and looks out to sea.
// The horizon sits a third down the free stage.
// A narrow stage widens the vertical view so the sea keeps its width.
export function makeCamera() {
  const cam = { w: 1, h: 1, pitch: 0.09, tanX: 0.35, tanY: 0.22 };
  cam.fit = (w, h, top = 0, bottom = 0) => {
    cam.w = w; cam.h = h;
    const a = w / h;
    cam.tanY = Math.max(0.215, 0.3 / a);
    cam.tanX = cam.tanY * a;
    // The horizon height, as a share of the stage from the foot.
    const free = Math.max(1, h - top - bottom);
    const v = (bottom + free * (a < 0.8 ? 0.6 : 0.66)) / h;
    cam.pitch = Math.atan((2 * v - 1) * cam.tanY);
  };
  // The view ray through a stage point in CSS pixels, y down.
  cam.ray = (px, py) => {
    const sx = px / cam.w * 2 - 1, sy = 1 - py / cam.h * 2;
    const p = cam.pitch, c = Math.cos(p), s = Math.sin(p);
    const d = [sx * cam.tanX, -s + sy * cam.tanY * c, c + sy * cam.tanY * s];
    const n = Math.hypot(...d);
    return d.map(v => v / n);
  };
  // Where a stage point meets the beach plane: x, z, distance, and the ray's fall.
  cam.ground = (px, py) => {
    const d = cam.ray(px, py);
    if (d[1] > -0.004) return null;
    const t = CAM_H / -d[1];
    return { x: d[0] * t, z: d[2] * t, t, fall: -d[1] };
  };
  // CSS pixels per metre, side to side, at distance t.
  cam.scale = t => cam.h / 2 / cam.tanY / t;
  return cam;
}

/* ---------- surf ---------- */
export function makeSurf() {
  let waves = [], nextIn = 0, count = 0, swell = 0.5;

  // Crest speed: fast in deep water, slow in the shallows.
  const speed = z => clamp(1.4 + 0.075 * z, 2.3, 7.5);
  const breakAt = A => 12.5 + 6.5 * A;

  function spawn(z = SPAWN, A = null) {
    // Every fifth wave or so comes in bigger, as sets do.
    const set = count % 5 === 3 || count % 5 === 4 ? 1.25 : 1;
    const amp = A ?? clamp((0.42 + 0.6 * swell) * set * jit(0.2), 0.3, 1.3);
    count++;
    const w = { z, A: amp, x0: (Math.random() * 2 - 1) * 5, seed: Math.random(), tb: -1, run: -1, R: 0, e: 0, broke: false, ran: false };
    waves.push(w);
    return w;
  }

  // Events for the sound: a break, a run-up.
  function step(dt, on = {}) {
    nextIn -= dt;
    if (nextIn <= 0) {
      spawn();
      nextIn = (8 - 3.2 * swell) * jit(0.25);
    }
    for (const w of waves) {
      if (w.run < 0) {
        const c = speed(w.z) * (w.tb >= 0 ? 0.92 : 1);
        w.z -= c * dt;
        if (w.tb < 0 && w.z < breakAt(w.A)) { w.tb = 0; on.crash?.(w); }
        else if (w.tb >= 0) w.tb += dt;
        if (w.z <= SHORE) {
          w.run = 0;
          w.R = clamp(1.3 + 2.1 * w.A, 1.4, 4.1) * jit(0.12);
          w.e = clamp(0.35 + 0.5 * w.A, 0.3, 1.2);
          on.swash?.(w);
        }
      } else {
        w.run += dt;
        if (w.tb >= 0) w.tb += dt;
      }
    }
    waves = waves.filter(w => w.run < 0 || w.run / upTime(w) < 2.3);
  }
  const upTime = w => 1.5 + 0.8 * w.A;

  // The swash front and its foam, from the run-up clock.
  function swashOf(w) {
    const s = w.run / upTime(w);
    if (s <= 1) return { z: SHORE - w.R * (1 - (1 - s) ** 2), e: w.e * (1 - 0.45 * s) };
    const b = clamp((s - 1) / 1.3, 0, 1);
    return { z: SHORE - w.R * (1 - b * b), e: w.e * 0.55 * (1 - b) };
  }

  // Uniform arrays, nearest wave first.
  // A: crest z, height unbroken, bore height, time since the break.
  // B: peel origin x, seed, face slope, swash foam (0 before the swash).
  const UA = new Float32Array(NW * 4), UB = new Float32Array(NW * 4);
  function pack() {
    const list = waves.slice().sort((a, b) => a.z - b.z).slice(0, NW);
    UA.fill(0); UB.fill(0);
    list.forEach((w, i) => {
      const zb = breakAt(w.A);
      const ss = clamp((SPAWN - w.z) / (SPAWN - zb), 0, 1);
      let z = w.z, e = 0;
      if (w.run >= 0) { const f = swashOf(w); z = f.z; e = Math.max(0.01, f.e); }
      const hU = w.A * (0.12 + 0.88 * ss * ss) * (1 + 0.12 * smooth(0.8, 1, ss));
      const hB = w.A * (0.14 + 0.3 * clamp((w.z - SHORE) / (zb - SHORE), 0, 1));
      UA.set([z, hU, hB, w.tb], i * 4);
      UB.set([w.x0, w.seed, 5 - 4.3 * ss * ss, e], i * 4);
    });
    return list.length;
  }

  return {
    step, pack, spawn, UA, UB,
    get waves() { return waves; },
    set swell(v) { swell = v; },
    get swell() { return swell; },
    // A big wave answers the Wave key: it rises just outside the break.
    send() {
      const z = 34;
      const near = waves.find(w => w.tb < 0 && Math.abs(w.z - z) < 7);
      if (near) { near.A = Math.max(near.A, 1.15) * jit(0.05); return near; }
      return spawn(z, clamp(1.05 + 0.25 * swell, 1, 1.35) * jit(0.06));
    },
    breakAt,
  };
}
