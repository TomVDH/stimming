// Solar loop: what the star card says about each star.
// Sources: SIMBAD-cited Wikipedia values, the ATNF Pulsar Catalogue, Joyce et al. 2020.
// Black holes: GRAVITY Collaboration 2022 (Sagittarius A*); Miller-Jones et al. 2021 (Cygnus X-1).
// 3C 273: GRAVITY Collaboration 2018 (its mass); Hipparcos measured it as a star.
// WR 124: Hamann et al. 2019 (radius, age); the Gaia distance.
// Thorne-Zytkow object: Thorne and Zytkow 1977; model sizes after Farmer et al. 2023.
// status: what is known of an object that is only predicted. core: what hides inside.
// V1400 Centauri: Mamajek et al. 2012; Kenworthy and Mamajek 2015 (the rings). rings: a ring system's size.
// Beta Lyrae: Harmanec and Scholz 1993 (the period); Mennickent and Djurasevic 2013 (the disc). orbit: a binary's period.
// S5-HVS1: Koposov et al. 2020. speed: a runaway's speed through the galaxy.
// mag may be a range in words.
// "about" marks an estimate or a value that sources dispute; null leaves the line out.
// name: the card's name where it differs from the tray's short one.
// type: what kind of object it is, in plain words, then its class.
// latin: the formal name; it is left out where it equals the common name.
// turn: one rotation. mag: apparent visual magnitude. wide: diameter in suns.
// mass: a black hole's mass; a star leaves it out.

export const FACTS = {
  zetaoph: { type: 'blue main-sequence star · O9.5 V', latin: null, cat: 'HIP 81377', turn: 'about a day', mag: 2.57, wide: '9.1 suns', dist: '440 light years', age: 'about 3 to 6 million years' },
  s5hvs1: { name: 'S5-HVS1', type: 'hypervelocity star · A-type main sequence', latin: null, cat: null, status: 'thrown out by Sagittarius A* 4.8 million years ago', mass: 'about 2.35 suns', speed: 'about 1,755 km/s, leaving the galaxy', turn: null, mag: null, wide: null, dist: 'about 29,000 light years', age: null },
  regulus: { type: 'blue-white subgiant · B8 IV', latin: 'Alpha Leonis', cat: 'HIP 49669', turn: '15.9 hours', mag: 1.4, wide: '4.2 suns', dist: '79 light years', age: 'at least a billion years' },
  vega: { type: 'white main-sequence star · A0 V', latin: 'Alpha Lyrae', cat: 'HIP 91262', turn: '16.3 hours', mag: 0.03, wide: '2.7 suns', dist: '25 light years', age: 'about 700 million years' },
  sirius: { type: 'white main-sequence star · A1 V', latin: 'Alpha Canis Majoris A', cat: 'HIP 32349', turn: 'about 2 to 5 days', mag: -1.46, wide: '1.7 suns', dist: '8.6 light years', age: '242 million years' },
  procyon: { type: 'yellow-white subgiant · F5 IV', latin: 'Alpha Canis Minoris A', cat: 'HIP 37279', turn: 'about 23 days', mag: 0.34, wide: '2 suns', dist: '11.5 light years', age: '1.9 billion years' },
  sun: { type: 'yellow dwarf · G2 V', name: 'The Sun', latin: 'Sol', cat: null, turn: '25 days at the equator', mag: -26.74, wide: '1 sun', dist: '8.3 light minutes', age: '4.6 billion years' },
  epseri: { type: 'orange dwarf · K2 V', latin: null, cat: 'HIP 16537', turn: '11.6 days', mag: 3.73, wide: '0.74 of the sun', dist: '10.5 light years', age: 'about 1.1 billion years' },
  proxima: { type: 'red dwarf, a flare star · M5.5 V', name: 'Proxima Centauri', latin: 'Alpha Centauri C', cat: 'HIP 70890', turn: 'about 85 days', mag: 11.1, wide: '0.16 of the sun', dist: '4.25 light years', age: 'about 4.85 billion years' },
  luhman: { type: 'a pair of brown dwarfs · L7.5 + T0.5', latin: null, cat: 'WISE J104915.57−531906.1', turn: '5.3 and 6.9 hours, a pair', mag: null, wide: '0.1 of the sun', dist: '6.5 light years', age: 'about 510 million years' },
  wise: { type: 'brown dwarf · Y4', name: 'WISE 0855−0714', latin: null, cat: 'WISE J085510.83−071442.5', turn: 'about 10 to 14 hours', mag: null, wide: '0.11 of the sun', dist: '7.4 light years', age: 'about 1 to 10 billion years' },
  ttauri: { type: 'protostar · K0', latin: null, cat: 'HIP 20390', turn: 'about 2.8 days', mag: 10.1, wide: '2.9 suns', dist: '471 light years', age: 'about a million years' },
  arcturus: { type: 'red giant · K1.5 III', latin: 'Alpha Boötis', cat: 'HIP 69673', turn: 'about 2 years', mag: -0.05, wide: '25 suns', dist: '36.7 light years', age: 'about 7.1 billion years' },
  rigel: { type: 'blue supergiant · B8 Ia', latin: 'Beta Orionis A', cat: 'HIP 24436', turn: 'about 100 days', mag: 0.13, wide: '74 suns', dist: 'about 850 light years', age: 'about 8 million years' },
  betelgeuse: { type: 'red supergiant · M1 Ia', latin: 'Alpha Orionis', cat: 'HIP 27989', turn: 'about 36 years', mag: 0.5, wide: 'about 760 suns', dist: 'about 550 light years', age: 'about 8 to 14 million years' },
  vycma: { type: 'red hypergiant · M5 Ia', name: 'VY Canis Majoris', latin: null, cat: 'HIP 35793', turn: null, mag: 7.95, wide: 'about 1,420 suns', dist: 'about 3,800 light years', age: 'about 8 million years' },
  wr124: { type: 'Wolf-Rayet star · WN8h', name: 'WR 124', latin: 'QR Sagittae', cat: null, turn: null, mag: 11.2, wide: 'about 12 suns', dist: 'about 21,000 light years', age: 'about 8.6 million years' },
  tzo: { type: 'Thorne–Żytkow object, a model', name: 'Thorne–Żytkow object', latin: null, cat: null, status: 'predicted in 1977, not yet found', core: 'a neutron star about 20 km wide', turn: null, mag: null, wide: 'about 1,000 suns, a model', dist: null, age: null },
  j1407: { name: 'A ringed star', type: 'a model, young star with giant rings · K5', latin: null, cat: null, status: 'a model: the rings of J1407b, which eclipsed V1400 Centauri in 2007, set round the star itself', rings: 'at least 37, scaled to 6 star radii', turn: 'about 3.2 days', mag: null, wide: null, dist: null, age: null },
  betalyr: { type: 'interacting binary · B7 II donor', latin: 'Sheliak', cat: 'HIP 92420', orbit: '12.94 days, 19 seconds longer each year', turn: null, mag: '3.3 to 4.4', wide: null, dist: 'about 1,000 light years', age: null },
  siriusb: { type: 'white dwarf · DA2', latin: 'Alpha Canis Majoris B', cat: 'WD 0642−166', turn: null, mag: 8.44, wide: '0.008 of the sun', dist: '8.6 light years', age: 'about 228 million years' },
  cygx1: { type: 'stellar black hole', latin: null, cat: 'HDE 226868, its companion', mass: '21 suns', turn: null, mag: null, wide: 'its horizon, 125 km', dist: 'about 7,200 light years', age: 'about 5 million years' },
  sgra: { type: 'supermassive black hole', latin: null, cat: null, mass: 'about 4.3 million suns', turn: null, mag: null, wide: 'its horizon, about 18 suns', dist: 'about 26,700 light years', age: null },
  qso: { type: 'quasar', latin: null, cat: 'HIP 60936', mass: 'about 260 million suns', turn: null, mag: 12.9, wide: 'its horizon, about 1,100 suns', dist: 'about 2.4 billion light years', age: null },
  neutron: { type: 'pulsar, a spinning neutron star', name: 'The Vela pulsar', latin: 'PSR B0833−45', cat: 'PSR J0835−4510', turn: '0.089 seconds', mag: 23.6, wide: '24 km', dist: 'about 940 light years', age: 'about 11,000 years' },
};

// A magnitude with a true minus sign.
const fmtMag = m => `${m < 0 ? '−' : ''}${Math.abs(m)}`;

/**
 * The card for an object: its name, its type and formal name, then one fact per row.
 * @param {string} id The object's id. @param {string} name Its common name.
 * @returns {{ name: string, type: string, latin: string | null, rows: [string, string][] }}
 */
export function cardLines(id, name) {
  const f = FACTS[id];
  const mag = f.mag == null ? null : typeof f.mag === 'string' ? f.mag : fmtMag(f.mag);
  // The type carries the spectral class after a dot; the card shows it as its own row (Tom, 2026-11-24).
  const [kind, spec = null] = f.type.split(' · ');
  return {
    name: f.name ?? name, type: kind, latin: f.latin,
    rows: [['spectral class', spec], ['status', f.status], ['catalogue', f.cat], ['mass', f.mass], ['core', f.core], ['rings', f.rings], ['orbit', f.orbit], ['speed', f.speed],
      ['rotation', f.turn], ['magnitude', mag], ['width', f.wide], ['distance', f.dist], ['age', f.age]].filter(([, v]) => v != null),
  };
}
