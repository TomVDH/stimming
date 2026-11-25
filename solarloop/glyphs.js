// Star catalog: the tray's icons, one per kind of body (Tom, 2026-11-24: shaded mono).
// One ink in three flat tones, drawn as SVG on a 64 unit square.
// The ink is currentColor; a hole's shadow takes the bar's dark ink.

const I = 'currentColor', B = 'var(--ink, #06070b)';
let uid = 0;

/* ---------- the primitives ---------- */
// A body: a pale disc, a mid disc and a bright cap, lit from the top left.
const body = (x, y, r, o = {}) => {
  const rx = o.rx || r, d = o.dim ? [0.18, 0.3, 0.5] : [0.28, 0.5, 0.9];
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${r}" fill="${I}" opacity="${d[0]}"/>`
    + `<ellipse cx="${x - r * 0.18}" cy="${y - r * 0.18}" rx="${rx * 0.7}" ry="${r * 0.7}" fill="${I}" opacity="${d[1]}"/>`
    + `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.38}" fill="${I}" opacity="${d[2]}"/>`;
};
// Half a tilted ellipse: the far half draws before the body, the near half after it.
const ring = (x, y, rx, ry, rot, near) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M${-rx} 0 A${rx} ${ry} 0 0 ${near ? 0 : 1} ${rx} 0" stroke="${I}" stroke-width="2.4" opacity="${near ? 0.8 : 0.35}"/></g>`;
// A soft envelope in two faint tones.
const halo = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${I}" opacity="0.08"/><circle cx="${x}" cy="${y}" r="${r * 0.66}" fill="${I}" opacity="0.12"/>`;
// Cloud bands across a disc.
const bands = (x, y, r) => {
  const id = `sl-g${uid++}`;
  let s = '';
  for (let i = 0; i < 7; i++) s += `<rect x="${x - r}" y="${y - r + i * r * 2 / 7}" width="${2 * r}" height="${r * 2 / 7}" fill="${I}" opacity="${i % 2 ? 0.25 : 0.55}"/>`;
  return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><g clip-path="url(#${id})">${s}</g>`;
};
const dot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${I}"/>`;
const line = (d, w = 2) => `<path d="${d}" stroke="${I}" stroke-width="${w}" opacity="0.45"/>`;
// A shadow with its bright edge.
const hole = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${B}" stroke="${I}" stroke-width="3" stroke-opacity="0.9"/>`;
// A dark patch on a disc.
const spot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${B}" opacity="0.4"/>`;

/* ---------- the kinds ---------- */
const DRAW = {
  main: () => body(32, 32, 22),
  spinner: () => body(32, 32, 18, { rx: 24 }),
  spotted: () => body(32, 32, 22) + spot(25, 30, 4) + spot(37, 40, 3) + spot(41, 26, 2),
  belt: () => ring(32, 32, 27, 8, -12, 0) + body(32, 32, 11) + ring(32, 32, 27, 8, -12, 1),
  runaway: () => body(36, 34, 11) + line('M14 14 Q6 34 16 54', 3),
  hyper: () => body(42, 32, 10) + line('M30 30 L4 26 M30 34 L6 40', 1.5),
  giant: () => body(32, 32, 26) + spot(40, 41, 8) + spot(19, 38, 4) + spot(36, 18, 3),
  cocoon: () => halo(32, 32, 27) + body(32, 32, 13, { dim: 1 }),
  core: () => body(32, 32, 22, { dim: 1 }) + halo(32, 32, 9) + dot(32, 32, 3),
  quasi: () => body(32, 32, 26, { dim: 1 }) + hole(32, 32, 5),
  brown: () => bands(32, 32, 16),
  proto: () => line('M32 4 V18 M32 46 V60', 1.5) + ring(32, 32, 24, 5, 0, 0) + body(32, 32, 9) + ring(32, 32, 24, 5, 0, 1),
  interacting: () => body(20, 32, 12) + line('M31 30 Q40 25 46 31', 3) + halo(48, 32, 9) + dot(48, 32, 2.5),
  contact: () => body(24, 32, 13) + body(40, 32, 13),
  darkdisc: () => body(22, 32, 13) + ring(44, 32, 16, 4, -70, 1),
  wind: () => halo(32, 32, 24) + body(32, 32, 8),
  shells: () => dot(32, 32, 3) + line('M18 32 A14 14 0 0 1 46 32', 1) + line('M10 32 A22 22 0 0 1 54 32', 1) + line('M3 32 A29 29 0 0 1 61 32', 1),
  // The smallest bodies draw at 18 px, so their marks run heavier.
  dwarf: () => halo(32, 32, 22) + dot(32, 32, 7),
  pulsar: () => line('M18 4 L46 60', 5) + dot(32, 32, 8),
  hole: () => ring(32, 34, 28, 6, 0, 0) + hole(32, 32, 11) + ring(32, 34, 28, 6, 0, 1),
  sstars: () => ring(32, 32, 26, 14, 30, 1) + ring(32, 32, 20, 8, -40, 1) + hole(32, 32, 7) + dot(52, 22, 2) + dot(16, 40, 1.5),
  quasar: () => line('M32 2 V22 M32 42 V62', 2) + ring(32, 32, 22, 7, 0, 1) + dot(32, 32, 4),
  arc: () => line('M8 46 A30 30 0 0 1 56 46', 3) + dot(32, 17, 3) + halo(32, 50, 6),
};

// Each object's kind; an object not listed draws as a main sequence star.
export const KIND = {
  sun: 'main', proxima: 'main', epseri: 'main', procyon: 'main', sirius: 'main',
  vega: 'spinner', regulus: 'spinner', zetaoph: 'runaway', xxtri: 'spotted', fomalhaut: 'belt', s5hvs1: 'hyper',
  arcturus: 'giant', rigel: 'giant', betelgeuse: 'giant', vycma: 'giant', st218: 'giant',
  wohg64: 'cocoon', tzo: 'core', quasi: 'quasi',
  luhman: 'brown', wise: 'brown', ttauri: 'proto',
  betalyr: 'interacting', vfts352: 'contact', epsaur: 'darkdisc', wr124: 'wind', wr140: 'shells',
  siriusb: 'dwarf', neutron: 'pulsar',
  cygx1: 'hole', powehi: 'hole', sgra: 'sstars', qso: 'quasar', earendel: 'arc', mothra: 'arc',
};

/**
 * Returns an object's icon as an SVG string on a 64 unit square.
 * @param {string} id The object's key.
 */
export function glyph(id) {
  const draw = DRAW[KIND[id]] || DRAW.main;
  return `<svg class="sl-glyph" viewBox="0 0 64 64" fill="none" stroke-linecap="round" aria-hidden="true" focusable="false">${draw()}</svg>`;
}
