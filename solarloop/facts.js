// Solar loop: what the star card says about each star.
// Sources: SIMBAD-cited Wikipedia values, the ATNF Pulsar Catalogue, Joyce et al. 2020.
// Black holes: GRAVITY Collaboration 2022 (Sagittarius A*); Miller-Jones et al. 2021 (Cygnus X-1).
// "about" marks an estimate or a value that sources dispute; null leaves the line out.
// name: the card's name where it differs from the tray's short one.
// latin: the formal name; it is left out where it equals the common name.
// turn: one rotation. mag: apparent visual magnitude. wide: diameter in suns.
// mass: a black hole's mass; a star leaves it out.

export const FACTS = {
  zetaoph: { latin: null, cat: 'HIP 81377', turn: 'about a day', mag: 2.57, wide: '9.1 suns', dist: '440 light years', age: 'about 3 to 6 million years' },
  regulus: { latin: 'Alpha Leonis', cat: 'HIP 49669', turn: '15.9 hours', mag: 1.4, wide: '4.2 suns', dist: '79 light years', age: 'at least a billion years' },
  vega: { latin: 'Alpha Lyrae', cat: 'HIP 91262', turn: '16.3 hours', mag: 0.03, wide: '2.7 suns', dist: '25 light years', age: 'about 700 million years' },
  sirius: { latin: 'Alpha Canis Majoris A', cat: 'HIP 32349', turn: 'about 2 to 5 days', mag: -1.46, wide: '1.7 suns', dist: '8.6 light years', age: '242 million years' },
  procyon: { latin: 'Alpha Canis Minoris A', cat: 'HIP 37279', turn: 'about 23 days', mag: 0.34, wide: '2 suns', dist: '11.5 light years', age: '1.9 billion years' },
  sun: { name: 'The Sun', latin: 'Sol', cat: null, turn: '25 days at the equator', mag: -26.74, wide: '1 sun', dist: '8.3 light minutes', age: '4.6 billion years' },
  epseri: { latin: null, cat: 'HIP 16537', turn: '11.6 days', mag: 3.73, wide: '0.74 of the sun', dist: '10.5 light years', age: 'about 1.1 billion years' },
  proxima: { name: 'Proxima Centauri', latin: 'Alpha Centauri C', cat: 'HIP 70890', turn: 'about 85 days', mag: 11.1, wide: '0.16 of the sun', dist: '4.25 light years', age: 'about 4.85 billion years' },
  luhman: { latin: null, cat: 'WISE J104915.57−531906.1', turn: '5.3 and 6.9 hours, a pair', mag: null, wide: '0.1 of the sun', dist: '6.5 light years', age: 'about 510 million years' },
  wise: { name: 'WISE 0855−0714', latin: null, cat: 'WISE J085510.83−071442.5', turn: 'about 10 to 14 hours', mag: null, wide: '0.11 of the sun', dist: '7.4 light years', age: 'about 1 to 10 billion years' },
  ttauri: { latin: null, cat: 'HIP 20390', turn: 'about 2.8 days', mag: 10.1, wide: '2.9 suns', dist: '471 light years', age: 'about a million years' },
  arcturus: { latin: 'Alpha Boötis', cat: 'HIP 69673', turn: 'about 2 years', mag: -0.05, wide: '25 suns', dist: '36.7 light years', age: 'about 7.1 billion years' },
  rigel: { latin: 'Beta Orionis A', cat: 'HIP 24436', turn: 'about 100 days', mag: 0.13, wide: '74 suns', dist: 'about 850 light years', age: 'about 8 million years' },
  betelgeuse: { latin: 'Alpha Orionis', cat: 'HIP 27989', turn: 'about 36 years', mag: 0.5, wide: 'about 760 suns', dist: 'about 550 light years', age: 'about 8 to 14 million years' },
  vycma: { name: 'VY Canis Majoris', latin: null, cat: 'HIP 35793', turn: null, mag: 7.95, wide: 'about 1,420 suns', dist: 'about 3,800 light years', age: 'about 8 million years' },
  siriusb: { latin: 'Alpha Canis Majoris B', cat: 'WD 0642−166', turn: null, mag: 8.44, wide: '0.008 of the sun', dist: '8.6 light years', age: 'about 228 million years' },
  cygx1: { latin: null, cat: 'HDE 226868, its companion', mass: '21 suns', turn: null, mag: null, wide: 'its horizon, 125 km', dist: 'about 7,200 light years', age: 'about 5 million years' },
  sgra: { latin: null, cat: null, mass: 'about 4.3 million suns', turn: null, mag: null, wide: 'its horizon, about 18 suns', dist: 'about 26,700 light years', age: null },
  neutron: { name: 'The Vela pulsar', latin: 'PSR B0833−45', cat: 'PSR J0835−4510', turn: '0.089 seconds', mag: 23.6, wide: '24 km', dist: 'about 940 light years', age: 'about 11,000 years' },
};

// A magnitude with a true minus sign.
const fmtMag = m => `${m < 0 ? '−' : ''}${Math.abs(m)}`;
// Labels pad to one width, so the values line up in the monospace face.
const row = (label, value) => value == null ? null : `${label.padEnd(11)}${value}`;

/**
 * The card for a star: its name and formal name, then one fact per row.
 * @param {string} id The star's id. @param {string} name Its common name.
 * @returns {{ head: string[], rows: string[] }}
 */
export function cardLines(id, name) {
  const f = FACTS[id];
  return {
    head: [f.name ?? name, f.latin].filter(Boolean),
    rows: [
      row('catalogue', f.cat), row('mass', f.mass), row('rotation', f.turn), row('magnitude', f.mag == null ? null : fmtMag(f.mag)),
      row('width', f.wide), row('distance', f.dist), row('age', f.age),
    ].filter(Boolean),
  };
}
