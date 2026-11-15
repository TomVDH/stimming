// A proposal (2026-11-15): more series, and one series for every toy.
// Nothing here ships. series.json and toys.json change only on Tom's yes.
// Vistas holds the cinematic scenes. Its icon is Layers in the Mint colourway (Tom, 2026-11-15).
export const PROPOSED = {
  vistas: { name: 'Vistas', nl: 'Vergezichten', kind: 'theme', icon: 'Layers', color: 'oklch(0.93 0.025 90)' },
  poke: { name: 'Poke & pop', nl: 'Prutsen', kind: 'theme', icon: 'Button', color: 'oklch(0.76 0.16 28)' },
  light: { name: 'Light & glass', nl: 'Licht', kind: 'theme', icon: 'Prism', color: 'oklch(0.88 0.1 200)' },
  wild: { name: 'Wild', nl: 'Buiten', kind: 'theme', icon: 'Dandelion', color: 'oklch(0.84 0.13 112)' },
  odd: { name: 'Odd one out', nl: 'Raar', kind: 'theme', icon: 'Saucer', color: 'oklch(0.76 0.19 322)' },
};
// The section order: the showpiece, the places, then the themes.
export const ORDER = ['vistas', 'eastvan', 'belgian', 'poke', 'light', 'goo', 'science', 'maths', 'dark', 'wild', 'odd'];
// Every toy, by series. A place still beats a theme.
// A toy that is not in this list shows last, in the section with no name.
export const SORT = {
  vistas: ['window', 'trainride', 'railgun', 'launch', 'foghorn', 'viaduct', 'meteor', 'windfarm', 'subway', 'washline', 'phaeton', 'ascent'],
  eastvan: ['eastvan', 'postcard'],
  belgian: ['frietkot', 'motorway', 'bread', 'chocolate', 'canal', 'beer'],
  poke: ['pop', 'fidget', 'domino', 'pins', 'magnet', 'soap', 'balloons', 'eyes', 'sequin', 'foil', 'cube', 'zipper', 'top', 'coil', 'gears', 'flap', 'spark', 'stone', 'ice', 'peel', 'harp', 'musicbox', 'crossing', 'meshball', 'washer'],
  light: ['prism', 'kaleido', 'glass', 'rain', 'neon', 'pool', 'frost', 'glow'],
  goo: ['putty', 'bubbles', 'lava', 'ink', 'ferro', 'oilslick', 'slime', 'marble', 'lavaskin'],
  science: ['vortex', 'chladni', 'pendulum', 'chamber', 'scope', 'windmap', 'bismuth', 'flametest', 'rubens', 'lichtenberg', 'schlieren'],
  maths: ['dijkstra', 'tesseract', 'harmono', 'orbits', 'ulam', 'turing'],
  dark: ['sonar', 'trails', 'fireworks', 'galaxy', 'nvg', 'plasma', 'steelwool'],
  wild: ['fire', 'walker', 'sand', 'snow', 'flock', 'dandelion', 'fireflies', 'purr', 'cuttle'],
  odd: ['shadyos', 'tvtree', 'morpher'],
};
export const seriesOf = id => Object.keys(SORT).find(k => SORT[k].includes(id)) || null;
