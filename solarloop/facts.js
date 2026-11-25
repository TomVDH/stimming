// Solar loop: what the star card says about each star.
// Sources: SIMBAD-cited Wikipedia values, the ATNF Pulsar Catalogue, Joyce et al. 2020.
// Black holes: GRAVITY Collaboration 2022 (Sagittarius A*); Miller-Jones et al. 2021 (Cygnus X-1).
// 3C 273: GRAVITY Collaboration 2018 (its mass); Hipparcos measured it as a star.
// WR 124: Hamann et al. 2019 (radius, age); the Gaia distance.
// Thorne-Zytkow object: Thorne and Zytkow 1977; model sizes after Farmer et al. 2023.
// status: what is known of an object that is only predicted. core: what hides inside.
// Fomalhaut: Kalas et al. 2008 (Hubble), Gaspar et al. 2023 (JWST); Mamajek 2012 (age). rings: a ring system's size.
// Beta Lyrae: Harmanec and Scholz 1993 (the period); Mennickent and Djurasevic 2013 (the disc). orbit: a binary's period.
// S5-HVS1: Koposov et al. 2020. speed: a runaway's speed through the galaxy.
// mag may be a range in words.
// "about" marks an estimate or a value that sources dispute; null leaves the line out.
// name: the card's name where it differs from the tray's short one.
// type: what kind of object it is, in plain words, then its class.
// latin: the formal name; it is left out where it equals the common name.
// turn: one rotation. mag: apparent visual magnitude. wide: diameter in suns.
// mass: a black hole's mass; a star leaves it out.
// found: the year of discovery; a naked-eye star is known since antiquity.
// Years: Innes 1915, Luhman 2013 and 2014, Hind 1852, Lalande 1801, Merrill 1938, Mamajek 2012,
// Goodricke 1784, Clark 1862, Bowyer 1964, Balick and Brown 1974, Schmidt 1963, Large 1968.

export const FACTS = {
  zetaoph: { type: 'blue main-sequence star · O9.5 V', latin: null, cat: 'HIP 81377', turn: 'about a day', mag: 2.57, wide: '9.1 suns', dist: '440 light years', age: 'about 3 to 6 million years', found: 'known since antiquity' },
  s5hvs1: { name: 'S5-HVS1', type: 'hypervelocity star · A-type main sequence', latin: null, cat: null, status: 'thrown out by Sagittarius A* 4.8 million years ago', mass: 'about 2.35 suns', speed: 'about 1,755 km/s, leaving the galaxy', turn: null, mag: null, wide: null, dist: 'about 29,000 light years', age: null, found: '2019' },
  regulus: { type: 'blue-white subgiant · B8 IV', latin: 'Alpha Leonis', cat: 'HIP 49669', turn: '15.9 hours', mag: 1.4, wide: '4.2 suns', dist: '79 light years', age: 'at least a billion years', found: 'known since antiquity' },
  vega: { type: 'white main-sequence star · A0 V', latin: 'Alpha Lyrae', cat: 'HIP 91262', turn: '16.3 hours', mag: 0.03, wide: '2.7 suns', dist: '25 light years', age: 'about 700 million years', found: 'known since antiquity' },
  sirius: { type: 'white main-sequence star · A1 V', latin: 'Alpha Canis Majoris A', cat: 'HIP 32349', turn: 'about 2 to 5 days', mag: -1.46, wide: '1.7 suns', dist: '8.6 light years', age: '242 million years', found: 'known since antiquity' },
  procyon: { type: 'yellow-white subgiant · F5 IV', latin: 'Alpha Canis Minoris A', cat: 'HIP 37279', turn: 'about 23 days', mag: 0.34, wide: '2 suns', dist: '11.5 light years', age: '1.9 billion years', found: 'known since antiquity' },
  sun: { type: 'yellow dwarf · G2 V', name: 'The Sun', latin: 'Sol', cat: null, turn: '25 days at the equator', mag: -26.74, wide: '1 sun', dist: '8.3 light minutes', age: '4.6 billion years', found: null },
  epseri: { type: 'orange dwarf · K2 V', latin: null, cat: 'HIP 16537', turn: '11.6 days', mag: 3.73, wide: '0.74 of the sun', dist: '10.5 light years', age: 'about 1.1 billion years', found: 'known since antiquity' },
  proxima: { type: 'red dwarf, a flare star · M5.5 V', name: 'Proxima Centauri', latin: 'Alpha Centauri C', cat: 'HIP 70890', turn: 'about 85 days', mag: 11.1, wide: '0.16 of the sun', dist: '4.25 light years', age: 'about 4.85 billion years', found: '1915' },
  luhman: { type: 'a pair of brown dwarfs · L7.5 + T0.5', latin: null, cat: 'WISE J104915.57−531906.1', turn: '5.3 and 6.9 hours, a pair', mag: null, wide: '0.1 of the sun', dist: '6.5 light years', age: 'about 510 million years', found: '2013' },
  wise: { type: 'brown dwarf · Y4', name: 'WISE 0855−0714', latin: null, cat: 'WISE J085510.83−071442.5', turn: 'about 10 to 14 hours', mag: null, wide: '0.11 of the sun', dist: '7.4 light years', age: 'about 1 to 10 billion years', found: '2014' },
  ttauri: { type: 'protostar · K0', latin: null, cat: 'HIP 20390', turn: 'about 2.8 days', mag: 10.1, wide: '2.9 suns', dist: '471 light years', age: 'about a million years', found: '1852' },
  arcturus: { type: 'red giant · K1.5 III', latin: 'Alpha Boötis', cat: 'HIP 69673', turn: 'about 2 years', mag: -0.05, wide: '25 suns', dist: '36.7 light years', age: 'about 7.1 billion years', found: 'known since antiquity' },
  rigel: { type: 'blue supergiant · B8 Ia', latin: 'Beta Orionis A', cat: 'HIP 24436', turn: 'about 100 days', mag: 0.13, wide: '74 suns', dist: 'about 850 light years', age: 'about 8 million years', found: 'known since antiquity' },
  betelgeuse: { type: 'red supergiant · M1 Ia', latin: 'Alpha Orionis', cat: 'HIP 27989', turn: 'about 36 years', mag: 0.5, wide: 'about 760 suns', dist: 'about 550 light years', age: 'about 8 to 14 million years', found: 'known since antiquity' },
  vycma: { type: 'red hypergiant · M5 Ia', name: 'VY Canis Majoris', latin: null, cat: 'HIP 35793', turn: null, mag: 7.95, wide: 'about 1,420 suns', dist: 'about 3,800 light years', age: 'about 8 million years', found: '1801' },
  wr124: { type: 'Wolf-Rayet star · WN8h', name: 'WR 124', latin: 'QR Sagittae', cat: null, turn: null, mag: 11.2, wide: 'about 12 suns', dist: 'about 21,000 light years', age: 'about 8.6 million years', found: '1938' },
  tzo: { type: 'Thorne–Żytkow object, a model', name: 'Thorne–Żytkow object', latin: null, cat: null, status: 'predicted in 1977, not yet found', core: 'a neutron star about 20 km wide', turn: null, mag: null, wide: 'about 1,000 suns, a model', dist: null, age: null, found: null },
  fomalhaut: { latin: 'Alpha Piscis Austrini', type: 'white main-sequence star with a dust belt · A3 V', cat: 'HIP 113368', status: 'its belt imaged by Hubble (2008) and JWST (2023)', rings: 'a dust belt 133 to 158 AU out, and an inner belt; scaled here', turn: null, mag: 1.16, wide: 'about 1.8 suns', dist: '25 light years', age: 'about 440 million years' },
  betalyr: { type: 'interacting binary · B7 II donor', latin: 'Sheliak', cat: 'HIP 92420', orbit: '12.94 days, 19 seconds longer each year', turn: null, mag: '3.3 to 4.4', wide: null, dist: 'about 1,000 light years', age: null, found: 'known since antiquity; its eclipses in 1784' },
  siriusb: { type: 'white dwarf · DA2', latin: 'Alpha Canis Majoris B', cat: 'WD 0642−166', turn: null, mag: 8.44, wide: '0.008 of the sun', dist: '8.6 light years', age: 'about 228 million years', found: '1862' },
  cygx1: { type: 'stellar black hole', latin: null, cat: 'HDE 226868, its companion', mass: '21 suns', turn: null, mag: null, wide: 'its horizon, 125 km', dist: 'about 7,200 light years', age: 'about 5 million years', found: '1964' },
  sgra: { type: 'supermassive black hole', latin: null, cat: null, mass: 'about 4.3 million suns', turn: null, mag: null, wide: 'its horizon, about 18 suns', dist: 'about 26,700 light years', age: null, found: '1974' },
  qso: { type: 'quasar', latin: null, cat: 'HIP 60936', mass: 'about 260 million suns', turn: null, mag: 12.9, wide: 'its horizon, about 1,100 suns', dist: 'about 2.4 billion light years', age: null, found: '1963, as a quasar' },
  st218: { type: 'red supergiant, perhaps a hypergiant', name: 'Stephenson 2-18', latin: null, cat: 'IRAS 18363−0607', turn: null, mag: null, wide: 'about 1,840 suns', dist: 'about 19,000 light years', age: null, found: '1988', wiki: 'https://en.wikipedia.org/wiki/Stephenson_2_DFK_1' },
  wohg64: { type: 'red supergiant in a dust torus · M7.5', name: 'WOH G64', latin: null, cat: 'IRAS 04553−6825', status: 'its torus imaged by VLTI in 2024, the first close-up of a star in another galaxy', turn: null, mag: '17.7 to 18.8', wide: 'about 1,540 suns', dist: 'about 163,000 light years, in the Large Magellanic Cloud', age: 'under 5 million years', found: 'the 1970s', wiki: 'https://en.wikipedia.org/wiki/WOH_G64' },
  quasi: { type: 'quasi-star, a model', name: 'Quasi-star', latin: null, cat: null, status: 'proposed in 2006, not yet found; JWST’s little red dots may be some', core: 'a black hole, fed by the envelope instead of fusion', turn: null, mag: null, wide: 'about 8,200 to 40,700 suns, a model', dist: 'the early universe', age: null, found: null, wiki: 'https://en.wikipedia.org/wiki/Quasi-star' },
  wr140: { type: 'colliding-wind binary, a Wolf-Rayet and an O star', name: 'WR 140', latin: 'V1687 Cygni', cat: 'HD 193793', status: 'more than 17 dust shells imaged by JWST, over 130 years of soot', orbit: '7.9 years, 1.3 to 23.9 AU apart', turn: null, mag: 6.85, wide: null, dist: 'about 5,000 light years', age: null, found: null, wiki: 'https://en.wikipedia.org/wiki/WR_140' },
  vfts352: { type: 'contact binary, two O stars', name: 'VFTS 352', latin: null, cat: null, status: 'the most massive contact pair known; it may merge, or end as two black holes', orbit: 'under 27 hours', turn: null, mag: null, wide: null, dist: 'about 160,000 light years, in the Tarantula Nebula', age: null, found: '2015', wiki: 'https://en.wikipedia.org/wiki/VFTS_352' },
  xxtri: { type: 'spotted orange giant · K0 III', name: 'XX Trianguli', latin: null, cat: 'HD 12545', status: 'a starspot wider than the Sun, mapped by Doppler imaging', orbit: '24 days, an unseen partner', turn: 'about 24 days', mag: '8.1 to 8.7', wide: 'about 9 to 11 suns', dist: 'about 640 light years', age: 'about 8 billion years', found: '1985, its variability', wiki: 'https://en.wikipedia.org/wiki/XX_Trianguli' },
  epsaur: { type: 'eclipsing binary, a supergiant and a dark disc · F0', name: 'Epsilon Aurigae', latin: 'Almaaz', cat: 'HD 31964', status: 'a dusty disc 3.8 AU wide crosses it every 27 years', orbit: '27 years; each eclipse lasts about two years', turn: null, mag: '2.92 to 3.83', wide: 'about 143 to 358 suns', dist: 'about 3,300 light years', age: null, found: 'known since antiquity; its dimming in 1821', wiki: 'https://en.wikipedia.org/wiki/Epsilon_Aurigae' },
  mothra: { type: 'lensed binary, a yellow hypergiant and a blue supergiant', name: 'Mothra', latin: null, cat: 'EMO J041608.8−240358', status: 'magnified by an unseen lens of 10,000 to a million suns, perhaps dark matter', turn: null, mag: null, wide: '271 suns and 60 suns', dist: 'about 10.5 billion light years', age: null, found: '2023', wiki: 'https://en.wikipedia.org/wiki/Mothra_(star)' },
  earendel: { type: 'lensed star, perhaps a star cluster · B', name: 'Earendel', latin: null, cat: 'WHL0137-LS', status: 'magnified by the galaxy cluster WHL0137-08; JWST suggests a star cluster', turn: null, mag: null, wide: 'about 103 to 393 suns, if one star', dist: '28 billion light years now; its light left 12.9 billion years ago', age: null, found: '2022', wiki: 'https://en.wikipedia.org/wiki/Earendel_(star)' },
  neutron: { type: 'pulsar, a spinning neutron star', name: 'The Vela pulsar', latin: 'PSR B0833−45', cat: 'PSR J0835−4510', turn: '0.089 seconds', mag: 23.6, wide: '24 km', dist: 'about 940 light years', age: 'about 11,000 years', found: '1968' },
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
    rows: [['spectral class', spec], ['status', f.status], ['catalogue', f.cat], ['discovered', f.found], ['mass', f.mass], ['core', f.core], ['rings', f.rings], ['orbit', f.orbit], ['speed', f.speed],
      ['rotation', f.turn], ['magnitude', mag], ['width', f.wide], ['distance', f.dist], ['age', f.age]].filter(([, v]) => v != null),
  };
}
