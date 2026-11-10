// One weather value drives the bundled shaders together.
// 0 is dry and still; 1 is a storm. A toy eases k and passes the values on.
//
//   const w = weather(k);
//   wgPane(..., w.rain, speed + w.wind, 0.4, w.fog, w.patches, edge)   // wetglass.js
//   wtWaves(p, t, foot, w.swell, w.chop, w.sets, sig2)                 // water.js
//   wtRings(p, t, foot, w.rings, 0.6, sig2)
//   skHaze(cam, P, w.haze * 0.0008, 150.0)                             // sky.js
//   ppRain(uv, asp, t, w.air, dir, 3)                                  // precip.js
// Every value is a plain number, so a toy can override any one of them.

const ramp = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function weather(k) {
  k = Math.min(1, Math.max(0, k));
  return {
    // Rain starts after the first tenth, so 0 stays fully dry.
    rain: 1.4 * ramp(0.08, 1, k),
    // Air speed over the glass, in m/s: it slants the runs.
    wind: 14 * k * k,
    // The pane mists up as the rain sets in.
    fog: 0.5 * ramp(0.2, 0.85, k),
    patches: 0.5 * k,
    // Rain or snow in the air, 0 to 1.
    air: ramp(0.08, 0.8, k),
    // Rings on the water follow the rain.
    rings: ramp(0.08, 0.7, k),
    // The water roughens: more chop, a longer swell, stronger wave sets.
    chop: 0.08 + 0.26 * k,
    swell: 0.008 + 0.02 * k,
    sets: 0.3 + 0.5 * k,
    // Cloud cover, 0 to 1.
    clouds: 0.15 + 0.8 * k,
    // The air thickens: 0 to 1 for the sky's haze.
    haze: 0.25 + 0.6 * k,
  };
}
