// Cloud in a bottle: the jug's sizes, the camera, the hose and the cloud noise.
// All sizes are in metres. The bench is y = 0; the jug axis is x = z = 0.

export const JUG = {
  // Body radius, body height, shoulder height, neck radius, mouth height, wall.
  R: 0.115, BODY: 0.19, SH: 0.105, RN: 0.021, TOP: 0.335, TH: 0.0045,
  // The water level.
  WATER: 0.038,
  // The bulb's centre on the bench, and its rest radii.
  BULB: [-0.27, 0.031, 0.115],
  BULB_R: [0.05, 0.031, 0.031],
};
// The stopper's half height; its top carries the hose.
export const STOP_H = 0.0175;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* ---------- camera ---------- */
// A fixed camera a little above the jug. fit() frames the jug, hose and bulb in the free stage.
export function makeCamera() {
  const aim = [-0.1, 0.19, 0.03];
  const from = norm([0.2, 0.23, 1.0]);
  const cam = { pos: [0, 0, 0], rot: new Float32Array(9), lens: [0.3, 0.2, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], w: 1, h: 1 };
  cam.fit = (w, h, top = 0, bottom = 0) => {
    cam.w = w; cam.h = h;
    const asp = w / h;
    const free = Math.max(0.4, (h - top - bottom) / h);
    const d = 1.3;
    // The content: 0.5 m wide and 0.42 m tall, with a margin.
    const tanY = Math.max(0.44 / (2 * d * free * 0.88), 0.54 / (2 * d * asp * 0.9));
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
  // Metres per CSS pixel at a world point.
  cam.scale = p => {
    const z = -dot(sub(p, cam.pos), cam.back);
    return (2 * z * cam.lens[1]) / cam.h;
  };
  return cam;
}

/* ---------- stopper and hose ---------- */
// The stopper's top centre in world space: lift in metres, tilts in radians.
// This is the inverse of stopLocal() in the shader.
export function stopperTop(lift, tx, tz) {
  let x = 0, y = STOP_H, z = 0;
  const cz = Math.cos(tz), sz = Math.sin(tz);
  [x, y] = [cz * x - sz * y, sz * x + cz * y];
  const cx = Math.cos(tx), sx = Math.sin(tx);
  [y, z] = [cx * y - sx * z, sx * y + cx * z];
  return [x, y + JUG.TOP + 0.002 + lift, z];
}
// The hose: a cubic curve from the stopper top to the bulb nozzle, in 13 points.
// out holds 39 floats. sway bends the arch a little after a pop.
export function hosePoints(out, top, nozzle, up, sway = 0) {
  const p0 = top, p3 = nozzle;
  // The arch clears the shoulder by a few millimetres; then the hose lies along the bench.
  const p1 = [top[0] + up[0] * 0.07 - 0.14, top[1] + up[1] * 0.07, top[2] + up[2] * 0.07 + 0.07 + sway * 0.03];
  const p2 = [nozzle[0] + 0.12, nozzle[1], nozzle[2] - sway * 0.02];
  for (let i = 0; i < 13; i++) {
    const t = i / 12, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = a * p0[k] + b * p1[k] + c * p2[k] + d * p3[k];
  }
  return out;
}

/* ---------- cloud noise ---------- */
// A tiling 3D texture: R holds smooth value noise, G holds puffy cells.
export const NOISE_N = 64;
export function makeNoise() {
  const N = NOISE_N, out = new Uint8Array(N * N * N * 2);
  let seed = 1337;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  // One octave of value noise with a period of p cells.
  const octave = p => {
    const lat = new Float32Array(p * p * p).map(() => rnd());
    const at = (x, y, z) => lat[((z % p) * p + (y % p)) * p + (x % p)];
    const f = new Float32Array(N * N * N);
    const s = p / N;
    let i = 0;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x * s, gy = y * s, gz = z * s;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz);
      const u = sm(gx - x0), v = sm(gy - y0), w = sm(gz - z0);
      const a = at(x0, y0, z0) + (at(x0 + 1, y0, z0) - at(x0, y0, z0)) * u;
      const b = at(x0, y0 + 1, z0) + (at(x0 + 1, y0 + 1, z0) - at(x0, y0 + 1, z0)) * u;
      const c = at(x0, y0, z0 + 1) + (at(x0 + 1, y0, z0 + 1) - at(x0, y0, z0 + 1)) * u;
      const d = at(x0, y0 + 1, z0 + 1) + (at(x0 + 1, y0 + 1, z0 + 1) - at(x0, y0 + 1, z0 + 1)) * u;
      const e = a + (b - a) * v, g = c + (d - c) * v;
      f[i++] = e + (g - e) * w;
    }
    return f;
  };
  const o1 = octave(4), o2 = octave(8), o3 = octave(16);
  // Cells: one point per cell, distance to the nearest, with wrap.
  const C = 6, pts = new Float32Array(C * C * C * 3).map(() => rnd());
  const cell = N / C;
  let i = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++, i++) {
    const v = o1[i] * 0.55 + o2[i] * 0.3 + o3[i] * 0.15;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let best = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ax = cx + dx, ay = cy + dy, az = cz + dz;
      const k = ((((az + C) % C) * C + ((ay + C) % C)) * C + ((ax + C) % C)) * 3;
      const px = (ax + pts[k]) * cell - x, py = (ay + pts[k + 1]) * cell - y, pz = (az + pts[k + 2]) * cell - z;
      const dd = px * px + py * py + pz * pz;
      if (dd < best * best * cell * cell) best = Math.sqrt(dd) / cell;
    }
    const puff = Math.max(0, 1 - best) * 0.7 + o3[i] * 0.3;
    out[i * 2] = Math.round(Math.min(1, Math.max(0, (v - 0.2) / 0.6)) * 255);
    out[i * 2 + 1] = Math.round(Math.min(1, puff) * 255);
  }
  return out;
}
