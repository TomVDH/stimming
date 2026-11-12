// Salvo QA probes: run inside /railgun/ through window.__qa.
// Use: const m = await import('/tests/railgun-salvo-qa.js'); await m.run('task2');
const q = () => window.__qa;
const log = [];
const ok = (cond, what) => { log.push(`${cond ? 'PASS' : 'FAIL'} ${what}`); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
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
};

export async function run(...names) {
  log.length = 0;
  for (const n of names) { log.push(`# ${n}`); checks[n](); }
  const fails = log.filter(l => l.startsWith('FAIL')).length;
  return { fails, log: [...log] };
}
