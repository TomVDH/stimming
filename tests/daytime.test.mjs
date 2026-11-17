// shared/daytime.js: the values match sky.js, the clock eases as Lanterns does.
// Run: node --test tests/daytime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOURS, dayAt, dayClock, wrapHour, photocell } from '../shared/daytime.js';
import { skyAt } from '../shared/sky.js';

test('dayAt gives the sky.js sun, day, stars and zenith bit for bit', () => {
  for (let h = -30; h < 50; h += 0.137) {
    const a = skyAt(h), b = dayAt(h);
    assert.deepEqual(b.sun, a.sun);
    assert.equal(b.day, a.day);
    assert.equal(b.stars, a.stars);
    assert.deepEqual(b.ambient, a.zen);
    assert.equal(b.lamps, 1 - a.day);
  }
});

test('the presets hold the toys\' own hours', () => {
  assert.deepEqual({ ...HOURS }, { dawn: 6.2, day: 12.5, afternoon: 16, golden: 18.3, dusk: 19.3, blue: 20.6, night: 23 });
});

test('wrapHour keeps an hour in 0 to 24 exact', () => {
  for (const h of [0, 6.2, 19.3, 23.999]) assert.equal(wrapHour(h), h);
  assert.equal(wrapHour(-1), 23);
  assert.equal(wrapHour(25), 1);
});

test('the moon stands opposite the sun', () => {
  for (const h of [0, 7, 12.5, 19.3]) {
    const d = dayAt(h), m = dayAt(h + 12).sun;
    d.moon.forEach((v, i) => assert.ok(Math.abs(v - m[i]) < 1e-12));
  }
});

test('the key light runs from the sun by day to the moon by night', () => {
  assert.equal(dayAt(HOURS.day).level, 1);
  assert.ok(Math.abs(dayAt(HOURS.night).level - 0.16) < 1e-12);
  const g = dayAt(HOURS.golden).light;
  assert.ok(g[0] > g[2], 'golden hour is warm');
});

test('the clock eases as Lanterns does, bit for bit', () => {
  const c = dayClock({ hour: 19.8 });
  c.to(22.5);
  let L = 19.8;
  for (let i = 0; i < 300; i++) {
    c.step(1 / 60);
    L += (22.5 - L) * (1 - Math.exp(-1 / 60 / 0.6));
    assert.equal(c.hour, L);
  }
});

test('the clock takes the short way round midnight', () => {
  const c = dayClock({ hour: 'night' });
  c.to('dawn');
  let hours = [];
  while (c.step(1 / 60)) hours.push(c.hour);
  assert.ok(hours.every(h => h >= 23 || h <= 6.2), 'it never passes through the day');
  assert.ok(!c.moving);
});

test('an unknown preset changes nothing; snap jumps', () => {
  const c = dayClock({ hour: 'dusk' });
  // @ts-ignore: the name is wrong on purpose.
  c.to('teatime');
  assert.equal(c.target, HOURS.dusk);
  c.to('night');
  c.snap();
  assert.equal(c.hour, HOURS.night);
});

test('photocell switches between its mark and the mark plus its width', () => {
  assert.equal(photocell(0.2, 0.28), 0);
  assert.equal(photocell(0.4, 0.28), 1);
  assert.ok(photocell(0.2925, 0.28) > 0 && photocell(0.2925, 0.28) < 1);
});
