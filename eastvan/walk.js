// East Van: the walk. It places modules end to end and says which are near.
// It has no three.js import, so it runs in node for the tests.

// The gap between two plinths, in metres.
export const GAP = 0.6;

// three.js turns a point about y as (x cos + z sin, -x sin + z cos).
const turn = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
// The plinth's world footprint: its SIZE turned by its YAW.
const foot = m => (Math.round(Math.cos(m.YAW || 0) * 1e6) === 0 ? [m.SIZE[1], m.SIZE[0]] : m.SIZE);

// mods: modules in walk order. start: the first plinth centre [x, z].
// A module's JOIN names the side where the next module joins it.
export function layWalk(mods, start) {
  const out = [];
  let cx = start[0], cz = start[1];
  mods.forEach((m, i) => {
    if (i > 0) {
      const p = mods[i - 1], [pw, pd] = foot(p), [w, d] = foot(m);
      if (p.JOIN === 'east') cx += pw / 2 + GAP + w / 2;
      else cz -= pd / 2 + GAP + d / 2;
    }
    const yaw = m.YAW || 0, o = turn(m.ORIGIN, yaw);
    out.push({ id: m.id ?? m.ID, centre: [cx, 0, cz], offset: [cx - o[0], -o[1], cz - o[2]], yaw, size: foot(m) });
  });
  return out;
}

// The active set: module i and its neighbours.
export function near(i, n) {
  return [i - 1, i, i + 1].filter(j => j >= 0 && j < n);
}

// A module's stop, moved from the module's frame into the world.
export function stopWorld(stop, placed) {
  const a = turn(stop.at, placed.yaw || 0);
  return { ...stop, at: [a[0] + placed.offset[0], a[1] + placed.offset[1], a[2] + placed.offset[2]], yaw: stop.yaw + (placed.yaw || 0) };
}

/* ---------- camera and sun math, shared by the page and the tests ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(...a); return a.map(v => v / l); };

// The camera distance that holds a stop's frame on a w x h screen.
export function fitDistance(stop, w, h, fov = 22) {
  const t = Math.tan(fov * Math.PI / 360);
  return Math.max(stop.h / (2 * t), (w < h ? stop.tall : stop.w) / (2 * t * (w / h)));
}
// The camera at rest on a stop: where it stands and what it looks at.
export function cameraFor(stop, w, h, fov = 22) {
  const d = fitDistance(stop, w, h, fov), p = stop.pitch ?? 0.3, a = stop.at;
  const pos = [a[0] + Math.sin(stop.yaw) * Math.cos(p) * d, a[1] + Math.sin(p) * d, a[2] + Math.cos(stop.yaw) * Math.cos(p) * d];
  return { pos, target: a, fov, aspect: w / h };
}
// A world point on screen, in pixels from the top left.
export function toScreen(pt, cam, w, h) {
  const f = unit(sub(cam.target, cam.pos)), r = unit(cross(f, [0, 1, 0])), u = cross(r, f), v = sub(pt, cam.pos), z = dot(v, f);
  const t = Math.tan(cam.fov * Math.PI / 360);
  return [(dot(v, r) / (z * t * cam.aspect) * 0.5 + 0.5) * w, (0.5 - dot(v, u) / (z * t) * 0.5) * h];
}
// The sun's shadow box for a set of placed modules.
// The box is measured along the light's own axes, so no corner falls out.
export function sunBox(set, dir, margin = 1.5) {
  const xs = set.flatMap(p => [p.centre[0] - p.size[0] / 2, p.centre[0] + p.size[0] / 2]);
  const zs = set.flatMap(p => [p.centre[2] - p.size[1] / 2, p.centre[2] + p.size[1] / 2]);
  const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const f = unit(dir.map(v => -v)), r = unit(cross(f, [0, 1, 0])), u = cross(r, f);
  let hx = 0, hy = 0;
  for (const p of set) for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-1.35, 0, 9]) {
    const v = sub([p.centre[0] + sx * p.size[0] / 2, y, p.centre[2] + sz * p.size[1] / 2], centre);
    hx = Math.max(hx, Math.abs(dot(v, r))); hy = Math.max(hy, Math.abs(dot(v, u)));
  }
  return { centre, half: [hx + margin, hy + margin] };
}
