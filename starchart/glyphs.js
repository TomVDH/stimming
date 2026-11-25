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
// Every kind draws its main body at about radius 20 of 64, so the box's size is the body's size.
// Rings, discs, winds and jets reach past it toward the box's edge.
const DRAW = {
  main: () => body(32, 32, 20),
  spinner: () => body(32, 32, 17, { rx: 22 }),
  spotted: () => body(32, 32, 20) + spot(25, 30, 4) + spot(37, 40, 3) + spot(41, 26, 2),
  belt: () => ring(32, 32, 31, 9, -12, 0) + body(32, 32, 16) + ring(32, 32, 31, 9, -12, 1),
  runaway: () => body(36, 33, 18) + line('M12 10 Q2 33 12 56', 3),
  // A Cepheid: the star inside the rings of its beat.
  cepheid: () => `<circle cx="32" cy="32" r="28" stroke="${I}" stroke-width="1.5" opacity="0.3"/><circle cx="32" cy="32" r="24" stroke="${I}" stroke-width="1.5" opacity="0.5"/>` + body(32, 32, 19),
  // Mira: the giant, its bow ahead and its tail streaming back.
  tail: () => line('M30 27 Q14 22 0 28 M30 37 Q14 42 0 36', 1.5) + body(38, 32, 15) + line('M52 13 Q63 32 52 51', 3),
  hyper: () => body(40, 32, 16) + line('M24 28 L0 22 M24 36 L2 44', 1.5),
  giant: () => body(32, 32, 22) + spot(40, 40, 7) + spot(20, 38, 3.5) + spot(36, 18, 2.5),
  cocoon: () => halo(32, 32, 31) + body(32, 32, 18, { dim: 1 }),
  core: () => body(32, 32, 22, { dim: 1 }) + halo(32, 32, 10) + dot(32, 32, 3.5),
  quasi: () => body(32, 32, 24, { dim: 1 }) + hole(32, 32, 6),
  brown: () => bands(32, 32, 20),
  proto: () => line('M32 0 V14 M32 50 V64', 1.5) + ring(32, 32, 30, 6, 0, 0) + body(32, 32, 14) + ring(32, 32, 30, 6, 0, 1),
  interacting: () => body(22, 32, 17) + line('M37 29 Q45 24 50 30', 3) + halo(52, 32, 9) + dot(52, 32, 2.5),
  contact: () => body(21, 32, 14) + body(43, 32, 14),
  darkdisc: () => body(24, 32, 17) + ring(47, 32, 19, 5, -70, 1),
  wind: () => halo(32, 32, 31) + body(32, 32, 12),
  shells: () => dot(32, 32, 4) + line('M18 32 A14 14 0 0 1 46 32', 1.2) + line('M10 32 A22 22 0 0 1 54 32', 1.2) + line('M2 32 A30 30 0 0 1 62 32', 1.2),
  // The smallest bodies draw a few pixels wide, so their marks run heavy.
  dwarf: () => halo(32, 32, 28) + dot(32, 32, 12),
  pulsar: () => line('M16 0 L48 64', 6) + dot(32, 32, 14),
  // A planetary nebula: a thick glowing ring round a hot point.
  // Two lobes on a tilted axis round a bright point.
  bipolar: () => halo(20, 20, 17) + halo(44, 44, 17) + dot(32, 32, 6),
  planetary: () => halo(32, 32, 30) + `<ellipse cx="32" cy="32" rx="22" ry="18" stroke="${I}" stroke-width="8" opacity="0.5"/>` + `<ellipse cx="32" cy="32" rx="22" ry="18" stroke="${I}" stroke-width="2.5" opacity="0.85"/>` + dot(32, 32, 3),
  // A supernova remnant: a ragged filament cage round a bright point.
  remnant: () => halo(32, 32, 27) + line('M8 30 Q20 12 36 10 Q54 14 58 32 Q54 50 34 54 Q14 52 8 30', 2) + line('M18 28 Q30 22 44 30 M24 42 Q34 36 46 42', 1.2) + dot(32, 32, 3.5),
  // A magnetar: a hot point in twisted field loops.
  magnetar: () => line('M32 22 C12 -2 -4 34 24 40', 2) + line('M32 42 C52 66 68 30 40 24', 2) + dot(32, 32, 12),
  hole: () => ring(32, 34, 31, 7, 0, 0) + hole(32, 32, 14) + ring(32, 34, 31, 7, 0, 1),
  sstars: () => ring(32, 32, 29, 15, 30, 1) + ring(32, 32, 22, 9, -40, 1) + hole(32, 32, 10) + dot(56, 20, 2.5) + dot(14, 42, 2),
  quasar: () => line('M32 0 V20 M32 44 V64', 2.5) + ring(32, 32, 26, 8, 0, 1) + dot(32, 32, 6),
  arc: () => line('M6 48 A31 31 0 0 1 58 48', 3) + dot(32, 17, 4) + halo(32, 50, 8),
};

// Each object's kind; an object not listed draws as a main sequence star.
export const KIND = {
  sun: 'main', proxima: 'main', epseri: 'main', procyon: 'main', przyb: 'main', sirius: 'main',
  vega: 'spinner', regulus: 'spinner', zetaoph: 'runaway', xxtri: 'spotted', fomalhaut: 'belt', s5hvs1: 'hyper',
  arcturus: 'giant', rigel: 'giant', etacar: 'bipolar', betelgeuse: 'giant', mira: 'tail', polaris: 'cepheid', rlep: 'giant', vycma: 'giant', st218: 'giant',
  wohg64: 'cocoon', tzo: 'core', quasi: 'quasi',
  luhman: 'brown', wise: 'brown', ttauri: 'proto',
  betalyr: 'interacting', vfts352: 'contact', epsaur: 'darkdisc', wr124: 'wind', wr140: 'shells',
  siriusb: 'dwarf', neutron: 'pulsar', magnetar: 'magnetar', crab: 'remnant', ring: 'planetary',
  cygx1: 'hole', powehi: 'hole', gargantua: 'hole', sgra: 'sstars', qso: 'quasar', earendel: 'arc', uhz1: 'arc', momz14: 'arc', mothra: 'arc',
};

/**
 * Returns an object's icon as an SVG string on a 64 unit square.
 * @param {string} id The object's key.
 */
export function glyph(id) {
  const draw = DRAW[KIND[id]] || DRAW.main;
  return `<svg class="sl-glyph" viewBox="0 0 64 64" fill="none" stroke-linecap="round" aria-hidden="true" focusable="false">${draw()}</svg>`;
}
