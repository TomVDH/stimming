// Salvo QA probes: run inside /railgun/ through window.__qa.
// Use: const m = await import('/tests/railgun-salvo-qa.js'); await m.run('task2');
const q = () => window.__qa;
const log = [];
const ok = (cond, what) => { log.push(`${cond ? 'PASS' : 'FAIL'} ${what}`); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
// The frame's mean brightness, 0 to 1, read right after a fresh draw.
function lum() {
  q().run(1 / 30);
  const cv = document.querySelector('#stage canvas'), c2 = document.createElement('canvas');
  c2.width = 64; c2.height = 40;
  const g = c2.getContext('2d', { willReadFrequently: true });
  g.drawImage(cv, 0, 0, 64, 40);
  const d = g.getImageData(0, 0, 64, 40).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
  return s / (d.length / 4) / 765;
}
// A reset runs a timelapse; presses wait until it ends.
function settle() { q().reset(); for (let i = 0; i < 40 && q().spin(); i++) q().run(1); q().run(0.5); }

const checks = {
  task2() {
    settle();
    q().mode('salvo'); q().hold(9); q().run(0.1);
    ok(q().bank() === 3, `a 9 s hold banks 3 rounds (got ${q().bank()})`);
    q().mode('rail');
    ok(q().fireMode() === 'salvo', 'a pick mid-hold waits for the next press');
    q().mode('salvo'); q().jump(8);
    ok(q().stage() === 'vent', `a hold past 16.6 s vents (got ${q().stage()})`);
    ok(q().bank() === 0, 'the vent empties the bank');
    ok(q().shot() === null, 'the vent fires nothing');
    settle();
    q().mode('rail'); q().charge(1);
    ok(q().fireMode() === 'rail', 'the next press takes the new pick');
    ok(near(q().level(), 1, 0.01), `Rail charges as before (level ${q().level()})`);
    ok(q().bank() === 0, 'Rail banks no rounds');
    q().release(); settle();
  },
  task3() {
    settle();
    q().salvo(3); q().run(2.5);
    ok(q().rounds().length === 3, `a 3-round salvo puts 3 rounds in flight (got ${q().rounds().length})`);
    ok(q().ion().visible, 'the ion trails show');
    q().salvo(1); q().run(0.5);
    ok(q().rounds().length === 4, `a second salvo fires once the first has launched (got ${q().rounds().length})`);
    q().run(12);
    ok(q().rounds().slice(0, 3).every(r => r.hit), 'every round of the first salvo lands');
    settle();
    q().salvo(5); q().salvo(1);
    ok(q().rounds().length === 5, `a fire during the launch is dropped (got ${q().rounds().length})`);
    q().run(2.4); q().salvo(1); q().run(0.5);
    ok(q().rounds().length === 6, `a fire after the last launch starts a new cycle (got ${q().rounds().length})`);
    settle();
    q().mode('rail'); q().shoot(1);
    ok(near(q().shot().T, 8.5, 0.01), `Rail flight time is unchanged (${q().shot().T})`);
    ok(near(q().shot().hitT, 8.8, 0.01), `Rail hit time is unchanged (${q().shot().hitT})`);
    ok(q().rounds().length === 1, 'Rail is one round');
    q().run(9);
    ok(q().ast().state === 'shatter', 'a Rail hit still breaks the rock');
    settle();
  },
  task4() {
    settle();
    const cap = q().cap();
    ok(cap === 240, `the cap is Tom's clearance point (${cap})`);
    q().salvo(5);
    const peaks = [];
    for (let j = 1; j <= 5; j++) { q().run(0.5); peaks.push(q().recoil().slide); }
    ok(peaks.every((p, i) => i === 0 || p > peaks[i - 1]), `the kick rises round by round (${peaks.map(Math.round)})`);
    ok(Math.max(...peaks) <= cap + 1, `no round slides past the cap (${Math.round(Math.max(...peaks))})`);
    ok(q().rings().filter(w => w > 0).length === 5, `five Mach rings run (${q().rings()})`);
    settle();
    q().mode('rail'); q().shoot(1); q().run(0.9);
    ok(q().recoil().slide > 300, `Rail still slams 320 m (${Math.round(q().recoil().slide)})`);
    ok(q().rings().filter(w => w > 0).length === 1, 'Rail runs one ring');
    settle();
  },
  task5() {
    settle();
    const before = lum();
    q().salvo(2); q().run(11.3);
    ok(lum() > 0.5 * before, `the frame stays lit as a crater lands (${lum().toFixed(3)} vs ${before.toFixed(3)})`);
    q().run(2.7);
    ok(near(q().tally().dmg, 0.7, 1e-5), `two rounds leave 0.7 damage (${q().tally().dmg})`);
    ok(q().craters() === 2, `two craters glow (${q().craters()})`);
    ok(q().ast().state !== 'shatter', 'the rock holds');
    q().salvo(4); q().run(11.5);
    ok(q().ast().state === 'shatter' && q().hunted() === 0, `hunts wait for the chunks to clear the fireball (${q().hunted()} burst at the break)`);
    q().run(2.5);
    ok(q().hunted() === 1, `the first hunt lands about 2.5 s after the break (${q().hunted()})`);
    q().run(6);
    const res = q().rounds().slice(-4).map(r => r.res);
    ok(JSON.stringify(res) === JSON.stringify(['break', 'hunt', 'hunt', 'hunt']), `a wounded rock: break, then three hunts (${res})`);
    ok(q().ast().state === 'shatter', 'the break shatters the rock');
    ok(q().hunted() === 3, `three chunks burst (${q().hunted()})`);
    settle();
    q().salvo(1); q().run(13);
    ok(q().rounds().slice(-1)[0].res === 'crater', 'a one-round salvo craters, never breaks');
    ok(q().ast().state !== 'shatter', 'the rock survives one round');
    // Reset clears at its cut under the white fill, as it does for the shot.
    q().salvo(5); q().run(4); settle();
    ok(q().rounds().length === 0, 'Reset clears the rounds');
    ok(q().tally().dmg === 0, 'Reset clears the tally');
    ok(q().craters() === 0, 'Reset clears the craters');
    settle();
    q().aimFree(40, 10); q().salvo(1); q().run(13);
    ok(q().tally().dmg === 0, 'a Free-aim round off the disc does no damage');
    ok(q().rounds().slice(-1)[0].res === 'miss', 'it is a miss');
    q().aimTrack();
    settle();
  },
  async task6() {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    settle();
    q().mute(false); await wait(300);
    q().salvo(5); q().run(2.5); await wait(1500);
    const p = q().audio().pend;
    ok(p >= 5, `five rounds schedule five reports or more (${p} pending)`);
    q().mute(true); await wait(300);
    ok(q().audio().pend === 0, `mute drains every pending sound (${q().audio().pend})`);
    q().mute(false); settle();
    const c0 = q().sfx().crater;
    q().salvo(2); q().run(11.5); await wait(600);
    ok(q().sfx().crater - c0 === 2, `each crater sounds (${q().sfx().crater - c0})`);
    q().mute(true); settle();
  },
};

export async function run(...names) {
  log.length = 0;
  for (const n of names) { log.push(`# ${n}`); await checks[n](); }
  const fails = log.filter(l => l.startsWith('FAIL')).length;
  return { fails, log: [...log] };
}
