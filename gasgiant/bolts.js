// Gas giant dive: lightning in the water deck, 75 km under the 1 bar level.
// Burst timing after Railgun (railgun/src/clouds/lightning.ts): 1 to 5 strokes, log-normal brightness.
// From above, a flash is a soft patch under the deck; from inside, it lights the cloud round you.
import { R } from './world.js';

export const MAX_FLASH = 4;
// Never more than three flash starts in one second.
const MAX_PER_S = 3;

const rnd = (a, b) => a + Math.random() * (b - a);
const logn = (mu, sd) => Math.exp(mu + sd * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()));

export function makeBolts() {
  return { strokes: [], next: 1.5, starts: [], heard: [] };
}

// A point at height h in the local frame, curved with the planet.
function at(x, z, h) {
  return [x, h - (x * x + z * z) / (2 * R), z];
}

/**
 * Steps the lightning by dt seconds.
 * alt: the eye's height. aim: [x, z] of the view's aim on the deck. soft: reduced motion. deck: 0 to 1 inside cloud.
 * live: false while the toy rests, so no new burst starts.
 */
export function stepBolts(B, dt, { alt, aim, soft, live, deck = 0 }) {
  const now = (B.clock = (B.clock || 0) + dt);
  B.starts = B.starts.filter(t => now - t < 1);
  // More bursts deeper down, where the water deck is near.
  const deep = Math.max(0, Math.min(1, (40 - alt) / 110));
  // Inside a deck the storm is all round: flashes come three times as often.
  const rate = (0.22 + 0.55 * deep) * (1 + 2 * deck) * (soft ? 0.5 : 1);
  B.next -= dt;
  if (live && B.next <= 0) {
    B.next = -Math.log(1 - Math.random()) / rate;
    burst(B, alt, aim, soft, now, deep);
  }
  for (const s of B.strokes) {
    s.wait -= dt;
    if (s.wait > 0) continue;
    if (!s.on) {
      if (B.starts.length >= MAX_PER_S) { s.wait = 0.34; continue; }
      s.on = true; s.age = 0; B.starts.push(now);
    }
    s.age += dt;
  }
  B.strokes = B.strokes.filter(s => !s.on || s.age < 0.9);
}

function burst(B, alt, aim, soft, now, deep) {
  let x, z, h = rnd(-86, -64);
  if (alt > 0) {
    // From above: somewhere on the deck ahead, near the view's aim.
    const d = Math.hypot(aim[0], aim[1]) || 300;
    x = aim[0] + rnd(-0.6, 0.6) * d;
    z = aim[1] + rnd(-0.5, 0.7) * d;
  } else {
    // From inside: near the eye, mostly below and ahead.
    const r = rnd(6, 38), a = rnd(-Math.PI, Math.PI);
    x = aim[0] * 0.3 + Math.cos(a) * r;
    z = aim[1] * 0.3 + Math.sin(a) * r;
    h = Math.min(h, alt - rnd(4, 18));
  }
  const n = soft ? 1 : 1 + Math.floor(Math.random() * Math.random() * 5);
  const base = (soft ? 0.5 : 1) * (alt > 0 ? 420 : 0.5 + 0.7 * deep);
  let wait = 0;
  for (let i = 0; i < n; i++) {
    B.strokes.push({ pos: at(x + rnd(-3, 3), z + rnd(-3, 3), h + rnd(-3, 3)), level: base * Math.min(3, logn(0, 0.5)), wait, on: false, age: 0 });
    wait += rnd(0.05, 0.22);
  }
  B.heard.push({ pos: at(x, z, h), level: alt > 0 ? 0.3 : 0.6 + 0.4 * deep, t: now });
}

/** Fills a Float32Array(16) with the brightest live flashes: x, y, z, level. */
export function flashUniform(B, out) {
  out.fill(0);
  const live = B.strokes.filter(s => s.on).map(s => {
    // A fast rise, then a decay with a flicker of return strokes.
    const k = s.age < 0.012 ? s.age / 0.012 : Math.exp(-(s.age - 0.012) / 0.09) * (0.8 + 0.2 * Math.cos(s.age * 90));
    return { pos: s.pos, w: s.level * Math.max(0, k) };
  }).sort((a, b) => b.w - a.w).slice(0, MAX_FLASH);
  live.forEach((f, i) => out.set([f.pos[0], f.pos[1], f.pos[2], f.w], i * 4));
  return live.length;
}

export const busyBolts = B => B.strokes.length > 0;
