// Tests for framing and shadows: every stop shows its plinth whole,
// and the sun's shadow box covers the modules that cast shadows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { layWalk, near, stopWorld, cameraFor, toScreen, sunBox } from '../walk.js';

const NAMES = ['house', 'yard', 'lane', 'run', 'drive'];
const mods = await Promise.all(NAMES.map(n => import(`../modules/${n}.js`)));
const placed = layWalk(mods.map(m => ({ ...m, id: m.ID })), [0, mods[0].ORIGIN[2]]);
// A plinth's eight corners in the world: its top and its strata's foot.
function corners(p) {
  const [w, d] = p.size, out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0.1, -1.35]) out.push([p.centre[0] + sx * w / 2, y, p.centre[2] + sz * d / 2]);
  return out;
}

for (const [w, h] of [[1280, 800], [375, 812], [812, 375]]) {
  test(`every stop frames its plinth at ${w} x ${h}`, () => {
    mods.forEach((m, i) => {
      const cam = cameraFor(stopWorld(m.STOP, placed[i]), w, h);
      for (const c of corners(placed[i])) {
        const [x, y] = toScreen(c, cam, w, h);
        assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${m.ID} corner ${c.map(v => v.toFixed(1))} at ${x.toFixed(0)}, ${y.toFixed(0)}`);
      }
    });
  });
}

test('the sun box covers every plinth in the active set', () => {
  const dir = [-15, 9, 22];
  mods.forEach((m, i) => {
    const set = near(i, mods.length).map(j => placed[j]), box = sunBox(set, dir);
    const len = Math.hypot(...dir), f = dir.map(v => -v / len);
    // The light's right and up axes, as three.js builds them for lookAt.
    let r = [f[2] * 1 - 0, 0, 0 - f[0] * 1]; const rl = Math.hypot(...r); r = r.map(v => -v / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    for (const p of set) for (const c of corners(p)) for (const y of [0, 9]) {
      const v = [c[0] - box.centre[0], y - box.centre[1], c[2] - box.centre[2]];
      const x = Math.abs(v[0] * r[0] + v[1] * r[1] + v[2] * r[2]), yy = Math.abs(v[0] * u[0] + v[1] * u[1] + v[2] * u[2]);
      assert.ok(x <= box.half[0] && yy <= box.half[1], `${m.ID}: a corner of ${p.id} falls outside the shadow box`);
    }
  });
});
