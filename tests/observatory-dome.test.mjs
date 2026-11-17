// Observatory dome motion maths. Run: node --test tests/observatory-dome.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  azDelta, clampAim, makeAxis, stepAxis, brakeAxis, atRest, moveTime, paceFor,
  makeShutter, stepShutter, shutterAtRest, SHUTTER_S, leadOf, settled,
} from '../observatory/src/core/dome.ts';

// The cupola's limits, Tom 2026-11-17.
const CUP = { cap: 2, accel: 0.6, wrap: true };
// The sidereal rate in degrees a second.
const SIDEREAL = 360 / 86164;
const FPS = [1 / 60, 0.1];

// Steps an axis toward a target for some seconds.
// see(ax, before, t) runs after each step.
function runAxis(ax, target, dt, secs, see = () => {}, lim = CUP) {
  for (let i = 1; i <= Math.round(secs / dt); i++) {
    const before = { ...ax };
    stepAxis(ax, typeof target === 'function' ? target(i * dt) : target, dt, lim);
    see(ax, before, i * dt);
  }
}

test('azDelta takes the short way', () => {
  assert.equal(azDelta(350, 10), 20);
  assert.equal(azDelta(10, 350), -20);
});
test('clampAim keeps 5° to 85°', () => {
  assert.equal(clampAim({ alt: -20, az: 90 }).alt, 5);
  assert.equal(clampAim({ alt: 89, az: 90 }).alt, 85);
});
test('the trapezoid never beats its cap or its acceleration, at 60 and at 10 frames a second', () => {
  for (const dt of FPS) {
    const ax = makeAxis(100);
    let cruise = 0;
    runAxis(ax, 160, dt, 60, (a, b) => {
      assert.ok(Math.abs(a.dvel) <= CUP.cap + 1e-9, `dt ${dt}: speed ${a.dvel}`);
      assert.ok(Math.abs(a.dvel - b.dvel) <= CUP.accel * dt + 1e-9, `dt ${dt}: speed change ${a.dvel - b.dvel}`);
      // The load on the drive moves without a step too.
      assert.ok(Math.abs(a.vel - b.vel) <= 1.1 * CUP.accel * dt + 1e-9, `dt ${dt}: load speed change ${a.vel - b.vel}`);
      if (Math.abs(a.dvel - CUP.cap) < 1e-9) cruise++;
    });
    assert.ok(cruise > 0, `dt ${dt}: it cruises at the cap`);
    assert.ok(atRest(ax), `dt ${dt}: at rest`);
    assert.equal(ax.pos, 160);
  }
});
test('the drive arrives at zero speed; the load overshoots about 0.08° once and rests exactly within 2 s', () => {
  for (const dt of FPS) {
    const ax = makeAxis(100);
    let arrived = null, rest = null, back = null, over = 0, after = 0;
    runAxis(ax, 130, dt, 40, (a, _, t) => {
      if (arrived === null && a.drv === 130 && a.dvel === 0) arrived = t;
      over = Math.max(over, a.pos - 130);
      if (over > 0 && back === null && a.pos <= 130) back = t;
      if (back !== null) after = Math.max(after, Math.abs(a.pos - 130));
      if (rest === null && atRest(a)) rest = t;
    });
    assert.ok(arrived !== null && Math.abs(arrived - moveTime(30, CUP.cap, CUP.accel)) < 0.2, `dt ${dt}: arrived at ${arrived}`);
    assert.ok(over > 0.06 && over < 0.1, `dt ${dt}: overshoot ${over}`);
    // The swing back takes about 1.2 s.
    // A second swing stays too small to see.
    assert.ok(back - arrived < 1.5, `dt ${dt}: back on the mark ${back - arrived} s after`);
    assert.ok(after < 0.005, `dt ${dt}: second swing ${after}`);
    assert.ok(rest - arrived <= 2, `dt ${dt}: rest ${rest - arrived} s after`);
    assert.equal(ax.pos, 130);
    assert.equal(ax.vel, 0);
  }
});
test('a retarget mid-move never changes speed faster than the acceleration', () => {
  for (const dt of FPS) {
    const ax = makeAxis(100);
    // Out toward 160, then back past the start mid-move.
    runAxis(ax, t => (t < 8 ? 160 : t < 14 ? 60 : 75), dt, 60, (a, b) => {
      assert.ok(Math.abs(a.dvel - b.dvel) <= CUP.accel * dt + 1e-9, `dt ${dt}: speed change ${a.dvel - b.dvel}`);
      assert.ok(Math.abs(a.vel - b.vel) <= 1.1 * CUP.accel * dt + 1e-9, `dt ${dt}: load speed change ${a.vel - b.vel}`);
    });
    assert.ok(atRest(ax) && ax.pos === 75, `dt ${dt}: rests at 75, at ${ax.pos}`);
  }
});
test('azimuth wrap takes the short way: 350° to 10°', () => {
  for (const dt of FPS) {
    const ax = makeAxis(350);
    runAxis(ax, 10, dt, 30, a => {
      const d = azDelta(350, a.pos);
      assert.ok(d > -0.2 && d < 20.2, `dt ${dt}: at ${a.pos}`);
      assert.ok(a.pos >= 0 && a.pos < 360, `dt ${dt}: wraps, ${a.pos}`);
    });
    assert.ok(atRest(ax), `dt ${dt}: at rest`);
    assert.equal(ax.pos, 10);
  }
});
test('a brake runs down under the acceleration, then rests exactly where it stops', () => {
  for (const dt of FPS) {
    const ax = makeAxis(0);
    runAxis(ax, 90, dt, 6);
    assert.ok(Math.abs(ax.dvel - CUP.cap) < 1e-9, `dt ${dt}: cruising, ${ax.dvel}`);
    for (let i = 0; i < 10 / dt; i++) {
      const b = { ...ax };
      brakeAxis(ax, dt, CUP);
      assert.ok(Math.abs(ax.dvel - b.dvel) <= CUP.accel * dt + 1e-9, `dt ${dt}: speed change ${ax.dvel - b.dvel}`);
      assert.ok(Math.abs(ax.vel - b.vel) <= 1.1 * CUP.accel * dt + 1e-9, `dt ${dt}: load speed change ${ax.vel - b.vel}`);
    }
    assert.ok(atRest(ax), `dt ${dt}: at rest`);
    assert.equal(ax.pos, ax.drv);
  }
});
test('a star at the sidereal rate: under 0.01° off after the settle, and the axis rests between frames', () => {
  for (const dt of FPS) {
    const ax = makeAxis(100);
    const star = t => 112 + SIDEREAL * t;
    runAxis(ax, star, dt, 400, (a, _, t) => {
      if (t < 20) return;
      assert.ok(Math.abs(azDelta(a.pos, star(t))) < 0.01, `dt ${dt}: ${azDelta(a.pos, star(t))} off at ${t}`);
      assert.ok(atRest(a), `dt ${dt}: moving at ${t}`);
    });
  }
});
test('moveTime and paceFor: a paced move from rest takes the time asked', () => {
  // 4 s up to speed, 11 s at the cap, 4 s down.
  assert.ok(Math.abs(moveTime(30, 2, 0.5) - 19) < 1e-9);
  // A short move never reaches the cap.
  assert.ok(Math.abs(moveTime(2, 2, 0.5) - 4) < 1e-9);
  for (const [d, want] of [[20, 25], [20, 40], [2, 9]]) {
    const k = paceFor(d, 1.5, 0.5, want);
    assert.ok(k > 0 && k <= 1, `pace ${k}`);
    assert.ok(Math.abs(moveTime(d, 1.5 * k, 0.5 * k) - want) < 1e-9, `${d}° in ${want} s`);
    // The stepped axis agrees.
    const ax = makeAxis(0);
    let at = null;
    for (let t = 1 / 60; t < 60 && at === null; t += 1 / 60) {
      stepAxis(ax, d, 1 / 60, { cap: 1.5, accel: 0.5, wrap: false }, k);
      if (ax.drv === d) at = t;
    }
    assert.ok(Math.abs(at - want) < 0.15, `${d}° in ${want} s: ${at}`);
  }
  assert.equal(paceFor(20, 1.5, 0.5, 1), 1);
});
test('the shutter: 6 s on an S-curve, then a 1% bounce at the end stop; the value stays in 0 to 1', () => {
  assert.equal(SHUTTER_S, 6);
  for (const dt of FPS) {
    for (const [from, goal] of [[0, 1], [1, 0]]) {
      const sh = makeShutter(from);
      assert.equal(sh.value, from);
      let t = 0, reached = null, deep = 0, back = null, prevV = 0, prev = sh.value;
      while (t < 9) {
        stepShutter(sh, goal, dt);
        t += dt;
        assert.ok(sh.value >= 0 && sh.value <= 1, `dt ${dt}: value ${sh.value}`);
        // Smooth: no speed step anywhere.
        const v = (sh.value - prev) / dt;
        assert.ok(Math.abs(v - prevV) <= 1.5 * dt + 1e-9, `dt ${dt}: speed step ${v - prevV} at ${t}`);
        prevV = v; prev = sh.value;
        if (reached === null && sh.p === goal) reached = t;
        if (reached !== null) deep = Math.max(deep, Math.abs(sh.value - goal));
        if (reached !== null && back === null && shutterAtRest(sh)) back = t;
        // A slow start: under 2% in the first half second.
        if (t <= 0.5 + 1e-9) assert.ok(Math.abs(sh.value - from) < 0.02, `dt ${dt}: slow start, ${sh.value}`);
      }
      assert.ok(Math.abs(reached - SHUTTER_S) <= 0.1, `dt ${dt}: travel ${reached} s`);
      assert.ok(deep > 0.008 && deep <= 0.0101, `dt ${dt}: bounce ${deep}`);
      assert.ok(back - reached <= 0.5, `dt ${dt}: bounce ends ${back - reached} s after`);
      assert.equal(sh.value, goal);
    }
  }
});
test('a shutter that turns back mid-way runs down first: no speed step', () => {
  const dt = 1 / 60;
  const sh = makeShutter(0);
  let prev = sh.value, prevV = 0;
  for (let t = dt; t < 14; t += dt) {
    stepShutter(sh, t < 3 ? 1 : 0, dt);
    const v = (sh.value - prev) / dt;
    assert.ok(Math.abs(v - prevV) <= 1.5 * dt + 1e-9, `speed step ${v - prevV} at ${t}`);
    prevV = v; prev = sh.value;
  }
  assert.ok(shutterAtRest(sh));
  assert.equal(sh.value, 0);
});
test('a zero step, as on the first frame after a sleep, changes nothing', () => {
  const ax = makeAxis(100);
  runAxis(ax, 160, 1 / 60, 5);
  const before = { ...ax };
  stepAxis(ax, 160, 0, CUP);
  assert.deepEqual(ax, before);
  brakeAxis(ax, 0, CUP);
  assert.deepEqual(ax, before);
  const sh = makeShutter(0);
  stepShutter(sh, 1, 1);
  const was = { ...sh };
  stepShutter(sh, 1, 0);
  assert.deepEqual(sh, was);
});
test('the load keeps within 10% of the acceleration on a short move, at up to 240 frames a second', () => {
  for (const dt of [1 / 240, 1 / 120, 1 / 60, 0.1]) {
    for (const d of [0.3, 2, 6]) {
      const ax = makeAxis(100);
      runAxis(ax, 100 + d, dt, 20, (a, b) => {
        assert.ok(Math.abs(a.vel - b.vel) <= 1.1 * CUP.accel * dt + 1e-9, `dt ${dt}, ${d}°: load speed change ${(a.vel - b.vel) / dt} a second`);
      });
      assert.ok(atRest(ax) && ax.pos === 100 + d, `dt ${dt}, ${d}°: at rest`);
    }
  }
});
test('a creeping target: the load moves at its speed with no lag, and settles', () => {
  // The rates of a star from the pole to near the zenith.
  for (const rate of [0.0005, 0.0054, 0.04, 0.2]) {
    for (const dt of [1 / 240, 1 / 60, 0.1]) {
      const ax = makeAxis(100);
      const star = t => 104 + rate * t;
      const n = Math.round(20 / dt);
      for (let i = 1; i <= n; i++) stepAxis(ax, star(i * dt), dt, CUP, 1, rate);
      const at = star(n * dt);
      assert.ok(Math.abs(azDelta(ax.pos, at)) < 0.002, `rate ${rate}, dt ${dt}: ${azDelta(ax.pos, at)} off`);
      assert.ok(Math.abs(ax.vel - rate) < 0.002, `rate ${rate}, dt ${dt}: speed ${ax.vel}`);
      assert.ok(settled(ax, at, rate, true), `rate ${rate}, dt ${dt}: settled`);
    }
  }
});
test('leadOf keeps the lead on one branch, even half a turn round', () => {
  const base = { pos: 100.01, vel: 2, drv: 99.99, dvel: 2 };
  const a = { pos: 280.0, vel: -1.5, drv: 280.02, dvel: -1.5 };
  const out = makeAxis(0);
  leadOf(a, base, out);
  assert.ok(Math.abs(out.pos - azDelta(base.pos, a.pos)) < 1e-9);
  assert.ok(Math.abs(out.drv - out.pos - 0.04) < 1e-9, `drive lead ${out.drv} against load lead ${out.pos}`);
  assert.equal(out.vel, -3.5);
  assert.equal(out.dvel, -3.5);
});
