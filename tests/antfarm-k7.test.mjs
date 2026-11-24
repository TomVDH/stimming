// K7, the production-line kit of Ant farm. Run: node --test tests/antfarm-k7.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLine } from '../antfarm/k7.js';

// Three places in a row: a source, a mill, a sink.
function small() {
  const L = makeLine({ speed: 20, seed: 3 });
  L.place('a', { x: 0, y: 0 });
  L.place('b', { x: 50, y: 0 });
  L.place('c', { x: 100, y: 0 });
  L.road('a', 'b');
  L.road('b', 'c', [50, 0, 75, 10, 100, 0]);
  L.store('raw', { at: 'a', n: 10 });
  L.store('in', { at: 'b', cap: 4 });
  L.store('out', { at: 'b', cap: 50 });
  L.store('done', { at: 'c' });
  L.haul('h1', { from: 'raw', to: 'in' });
  L.step('mill', { at: 'b', takes: { in: 1 }, gives: { out: 1 }, time: 0.5, hands: 2 });
  L.haul('h2', { from: 'out', to: 'done' });
  return L;
}
const run = (L, secs, dt = 1 / 30) => { for (let i = 0; i < secs / dt; i++) L.tick(dt); };

test('routes join roads and run either way', () => {
  const L = small();
  assert.deepEqual(L.route('a', 'c'), [0, 0, 50, 0, 75, 10, 100, 0]);
  assert.deepEqual(L.route('c', 'a'), [100, 0, 75, 10, 50, 0, 0, 0]);
});

test('goods flow through the line and are conserved', () => {
  const L = small();
  for (let i = 0; i < 4; i++) L.hire({ at: 'a' });
  run(L, 60);
  const s = id => L.stores.get(id).n;
  assert.equal(s('done'), 10);
  assert.equal(s('raw') + s('in') + s('out'), 0);
  assert.equal(L.steps.get('mill').count, 10);
});

test('a full store makes carriers wait in a queue', () => {
  const L = small();
  L.unstep('mill');
  for (let i = 0; i < 8; i++) L.hire({ at: 'a' });
  let waited = 0;
  L.on('wait', () => waited++);
  run(L, 20);
  assert.equal(L.stores.get('in').n, 4);
  assert.ok(waited > 0);
  assert.ok(L.stores.get('in').q.length > 0);
});

test('auto steps run with no worker; milestones fire once', () => {
  const L = small();
  L.store('egg', { at: 'c', n: 2 });
  L.store('ant', { at: 'c' });
  L.step('hatch', { at: 'c', takes: { egg: 1 }, gives: { ant: 1 }, time: 1, auto: 2 });
  let fired = 0;
  L.milestone('two', { test: l => l.stores.get('ant').n >= 2, then: () => fired++ });
  run(L, 4);
  assert.equal(L.stores.get('ant').n, 2);
  assert.equal(fired, 1);
  assert.ok(L.reached('two'));
});

test('save and load keep stocks, milestones and workers', () => {
  const L = small();
  for (let i = 0; i < 3; i++) L.hire({ at: 'a', data: { k: i } });
  L.milestone('m', { test: () => true, then: () => {} });
  run(L, 2);
  const o = JSON.parse(JSON.stringify(L.save()));
  const M = small();
  let again = 0;
  M.milestone('m', { test: () => true, then: (_, loading) => { if (loading) again++; } });
  M.load(o);
  assert.equal(M.workers.length, 3);
  assert.equal(again, 1);
  assert.deepEqual(M.workers.map(w => w.data.k), [0, 1, 2]);
  const total = id => (L.stores.get(id).n);
  assert.equal(M.stores.get('done').n, total('done'));
});
