// Capital ship core: states, hits, joint order, hulk fall and light.
// It has no imports, so node can test it.
// Hull frame: x runs stern to prow, y up, z to starboard. Units are metres and seconds.

export const KILL = 0.85;
export const ARRIVE = 40;
export const VACUUM = 15;
export const BREAK = 2;
export const SHIP_ALT = 300000;

const EARTH_R = 6371000;
const ENTRY_SPAN = 10;
const SOFT_EDGE = 1000;
const DRIFT_PERIOD = 60;

export const HULL = {
  len: 11000,
  joints: [2440, 150, -2520],
  sections: [
    { id: 'prow', x0: 2440, x1: 5500, depth: 900 },
    { id: 'fore', x0: 150, x1: 2440, depth: 1200 },
    { id: 'mid', x0: -2520, x1: 150, depth: 1350 },
    { id: 'drive', x0: -5500, x1: -2520, depth: 1850 },
    // The tower stands 570 m on the mid deck.
    { id: 'tower', x0: -2300, x1: -1380, depth: 570 },
  ],
};

// Each hulk breaks at the later of its two bounding joints.
const BOUNDS = {
  prow: [2440],
  fore: [2440, 150],
  mid: [150, -2520],
  drive: [-2520],
  tower: [150],
};

const smoothstep = x => x * x * (3 - 2 * x);
const clamp01 = x => Math.min(1, Math.max(0, x));

export function makeShip(seed, t) {
  let s = Math.floor(Math.abs(seed)) % 2147483647 || 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const hulks = HULL.sections.map((sec, i) => ({
    id: sec.id,
    fallT: 60 + rnd() * 60,
    dist: 40000 + rnd() * 40000,
    // Five bearings spread over about +-0.6 rad; 0 is straight ahead.
    bearing: -0.6 + i * 0.3 + (rnd() - 0.5) * 0.1,
    rumbleDelay: 15 + rnd() * 10,
    breakAt: null,
    landedAt: null,
  }));
  return { state: 'arrive', t0: t, wound: null, hulks, seed };
}

export function jointOrder(hitX) {
  const list = HULL.joints
    .map(joint => ({ joint, d: Math.abs(joint - hitX) }))
    .sort((a, b) => a.d - b.d);
  const far = list[list.length - 1].d || 1;
  return list.map(({ joint, d }) => ({ joint, at: (d / far) * BREAK }));
}

export function hulkAt(h, age) {
  const f = clamp01((age / h.fallT) ** 2);
  const entry = age < VACUUM ? 0 : smoothstep(clamp01((age - VACUUM) / ENTRY_SPAN));
  // Spin rate stays under 0.1 rad/s.
  const rate = 0.03 + ((h.fallT - 60) / 60) * 0.04;
  return { f, tumble: Math.max(0, age) * rate, entry, landed: age >= h.fallT };
}

export function stepShip(ship, t) {
  if (ship.state === 'arrive' && t >= ship.t0 + ARRIVE) ship.state = 'station';
  if (ship.state === 'breakup' && ship.hulks.every(h => t >= h.breakAt)) ship.state = 'falling';
  if (ship.state === 'falling' || ship.state === 'breakup') {
    for (const h of ship.hulks) {
      if (h.landedAt === null && h.breakAt !== null && hulkAt(h, t - h.breakAt).landed) {
        h.landedAt = h.breakAt + h.fallT;
      }
    }
  }
  if (ship.state === 'falling' && ship.hulks.every(h => h.landedAt !== null)) ship.state = 'gone';
}

export function hitShip(ship, c, t, hitX) {
  if (ship.state !== 'station' && ship.state !== 'wounded') return null;
  if (c >= KILL || ship.state === 'wounded') {
    const at = {};
    for (const j of jointOrder(hitX)) at[j.joint] = t + j.at;
    for (const h of ship.hulks) h.breakAt = Math.max(...BOUNDS[h.id].map(j => at[j]));
    ship.state = 'breakup';
    return 'kill';
  }
  const near = HULL.joints.reduce((a, b) => (Math.abs(b - hitX) < Math.abs(a - hitX) ? b : a));
  ship.wound = { joint: near, t0: t };
  ship.state = 'wounded';
  return 'wound';
}

export function driftDeg(t) {
  return t / DRIFT_PERIOD;
}

// Light reaches the ship below the horizon while the ship sits high enough.
export function sunlit(alt, sunDeg) {
  if (sunDeg >= 0) return 1;
  const dep = -sunDeg * Math.PI / 180;
  if (dep >= Math.PI / 2) return 0;
  const edge = EARTH_R * (1 / Math.cos(dep) - 1);
  return clamp01((alt - edge) / (2 * SOFT_EDGE) + 0.5);
}
