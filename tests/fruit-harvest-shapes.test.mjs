import test from 'node:test';
import assert from 'node:assert/strict';
import { harvestShape } from '../fruit/harvest-shapes.js';

for (const id of ['lemon', 'mango', 'avocado', 'papaya', 'coconut']) {
  test(`${id}: mirrored halves meet with continuous slope and closed poles`, () => {
    const d = 0.000001;
    for (let i = 0; i < 96; i++) {
      const ph = i / 96 * Math.PI * 2;
      const l = harvestShape(id, 0, ph, -0.035);
      const r = harvestShape(id, 0, -ph, 0.035);
      assert.ok(Math.abs(l-r) < 1e-10);
      const dl = (harvestShape(id, d, ph, -0.035)-l)/d;
      const dr = (harvestShape(id, d, -ph, 0.035)-r)/d;
      assert.ok(Math.abs(dl+dr) < 0.00001);
      assert.equal(harvestShape(id, 1, ph, -0.035), 0);
      for (const t of [0.1, 0.5, 0.9]) {
        assert.ok(harvestShape(id, t, ph, -0.035) > 0);
        assert.ok(Math.abs(harvestShape(id,t,ph,-0.035)-harvestShape(id,t,ph+Math.PI*2,-0.035)) < 1e-10);
      }
    }
  });
}
