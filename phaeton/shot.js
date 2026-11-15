// Phaeton shot: plain maths, no three.js.
// Two clocks. s is the playhead in real seconds; T = W(s) is the shot time.
// Matter reads T. Camera, light and sound read s.

/**
 * @param {object} o
 * @param {number} o.muzzle The slug's x at T = 0.
 * @param {number} o.speed The slug speed in metres per second.
 * @param {{ x: number, r: number }[]} o.targets Each target's centre x and half depth, in row order.
 * @param {number} [o.hold] Real seconds for one photo.
 * @param {number} [o.travel] Real seconds in the dark between two photos.
 * @param {number} [o.lead] Real seconds from the muzzle to the first photo.
 * @param {number} [o.pre] Shot seconds a photo starts before the slug enters.
 * @param {number} [o.post] Shot seconds a photo runs after the slug enters.
 * @param {number} [o.ramp] Real seconds for time to return after the last photo.
 * @param {number} [o.tail] Real seconds of real time at the end.
 */
export function makeShot({ muzzle, speed, targets, hold = 1.2, travel = 0.3, lead = 0.35, pre = 6e-5, post = 5e-4, ramp = 1.1, tail = 3.2 }) {
  const tHit = targets.map(t => (t.x - t.r - muzzle) / speed);
  // A photo slows toward its end; it never stops.
  const ease = u => u * (1.6 - 0.6 * u), endRate = 0.4;
  const spans = [];
  let s = 0, T = 0;
  const add = (kind, ds, T1, i = -1) => { spans.push({ kind, i, s0: s, s1: s + ds, T0: T, T1 }); s += ds; T = T1; };
  tHit.forEach((t, i) => {
    add(i ? 'travel' : 'lead', i ? travel : lead, t - pre, i);
    add('photo', hold, t + post, i);
  });
  // Time returns along a geometric ramp: the rate grows from the photo's to one.
  const r0 = (pre + post) * endRate / hold, k = Math.log(1 / r0);
  const rampT = u => r0 * ramp * (Math.exp(k * u) - 1) / k;
  add('ramp', ramp, T + rampT(1));
  add('real', tail, T + tail);
  const dur = s;
  /** The shot time at playhead s. */
  function W(sIn) {
    const q = Math.min(Math.max(sIn, 0), dur);
    const sp = spans.find(e => q <= e.s1) || spans[spans.length - 1], u = (q - sp.s0) / (sp.s1 - sp.s0);
    if (sp.kind === 'photo') return sp.T0 + (sp.T1 - sp.T0) * ease(u);
    if (sp.kind === 'ramp') return sp.T0 + rampT(u);
    return sp.T0 + (sp.T1 - sp.T0) * u;
  }
  /** The span at playhead s, with u as its progress from 0 to 1. */
  function at(sIn) {
    const q = Math.min(Math.max(sIn, 0), dur);
    const sp = spans.find(e => q <= e.s1) || spans[spans.length - 1];
    return { ...sp, u: (q - sp.s0) / (sp.s1 - sp.s0) };
  }
  return { tHit, spans, dur, W, at, slugX: t => muzzle + speed * t };
}
