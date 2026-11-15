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
