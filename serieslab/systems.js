// Icon systems: one strict geometry for every series icon.
// Each system draws the same six subjects on a 32 x 32 grid.
// A system is a function (key, colour) that returns one SVG string.
const BG = 'oklch(0.16 0.012 275)';
const deep = c => `color-mix(in oklch, ${c} 55%, black)`;
const light = c => `color-mix(in oklch, ${c} 45%, white)`;
const svg = body => `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;

// --- Tiles ------------------------------------------------------------------
// A 6 x 6 mosaic. A cell is a square, a disc, a quarter disc or a half square.
// `#` square, `o` disc, `r t b l` quarter discs (round corner: TL, TR, BR, BL),
// `1 2 3 4` half squares (the filled corner: BR, BL, TL, TR), `.` empty.
// The tone rows match the shape rows: 1 deep, 2 body, 3 light.
const U = 5, O = 1;
const CELL = {
  '#': (x, y) => `M${x} ${y}h${U}v${U}h${-U}Z`,
  o: (x, y) => `M${x} ${y + U / 2}a${U / 2} ${U / 2} 0 1 0 ${U} 0a${U / 2} ${U / 2} 0 1 0 ${-U} 0Z`,
  r: (x, y) => `M${x + U} ${y + U}H${x}A${U} ${U} 0 0 1 ${x + U} ${y}Z`,
  t: (x, y) => `M${x} ${y + U}V${y}A${U} ${U} 0 0 1 ${x + U} ${y + U}Z`,
  b: (x, y) => `M${x} ${y}H${x + U}A${U} ${U} 0 0 1 ${x} ${y + U}Z`,
  l: (x, y) => `M${x + U} ${y}V${y + U}A${U} ${U} 0 0 1 ${x} ${y}Z`,
  1: (x, y) => `M${x} ${y + U}H${x + U}V${y}Z`,
  2: (x, y) => `M${x} ${y}V${y + U}H${x + U}Z`,
  3: (x, y) => `M${x} ${y}H${x + U}L${x} ${y + U}Z`,
  4: (x, y) => `M${x} ${y}H${x + U}V${y + U}Z`,
};
const TILES = {
  // A crow on a wire, beak to the right.
  eastvan: { g: ['...rt.', '...##3', '.r##b.', '1##b..', '.lb...', '######'], t: ['222222', '222223', '222222', '222222', '222222', '111111'], dots: [[23.6, 5.6, 1.1]] },
  // Frites in a cone.
  belgian: { g: ['..#.#.', '.####.', '.####.', '######', '.4##3.', '..43..'], t: ['232323', '232323', '232323', '111111', '222222', '222222'] },
  // A flask, half full.
  science: { g: ['..##..', '..##..', '.1##2.', '1####2', '######', 'l####b'], t: ['222222', '222222', '222222', '222222', '333333', '333333'] },
  // A crescent and one star.
  dark: { g: ['.r#t..', 'r#3...', '##..o.', '##....', 'l#2...', '.l#b..'], t: ['222222', '222222', '222232', '222222', '222222', '222222'] },
  // Goo that drips; one drop lets go.
  goo: { g: ['######', '######', 'l##.#b', '.##.#.', '.lb.o.', '......'], t: ['222222', '222222', '222222', '222222', '222232', '222222'] },
  // A right triangle on its long side.
  maths: { g: ['2.....', '#2....', '##2...', '###2..', '####2.', '######'], t: ['222222', '222222', '232222', '233222', '233322', '111111'] },
};
function tiles(key, c) {
  const d = TILES[key];
  if (!d) return '';
  const paths = { 1: '', 2: '', 3: '' };
  d.g.forEach((row, j) => [...row].forEach((ch, i) => {
    if (CELL[ch]) paths[d.t?.[j]?.[i] || 2] += CELL[ch](O + i * U, O + j * U);
  }));
  const tone = { 1: deep(c), 2: c, 3: light(c) };
  // A hair of stroke in the same colour closes the seams between cells.
  const body = [1, 2, 3].map(n => paths[n] && `<path d="${paths[n]}" style="fill:${tone[n]};stroke:${tone[n]};stroke-width:0.25;stroke-linejoin:round"/>`).join('');
  const dots = (d.dots || []).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${BG}"/>`).join('');
  return svg(body + dots);
}

// --- Fold -------------------------------------------------------------------
// One solid silhouette. A diagonal fold lights its upper left half.
// `d` is the silhouette path; `cut` punches holes after the fold.
const g24 = body => `<g transform="translate(1.2 1.2) scale(1.2333)">${body}</g>`;
const FOLD = {
  eastvan: { d: `<path d="M7 22C7 15 11.5 11 17 11C18 8 21.4 7 23.6 8.8L27.6 10L24 11.6C24.2 16.4 21.4 20.4 16.4 22.4L5 27ZM13.4 21H14.8V27H13.4ZM16.8 20H18.2V27H16.8ZM2 26.6H30V28.4H2Z"/>`, cut: `<circle cx="21.8" cy="9.9" r="1"/>` },
  belgian: { d: `<path d="M7.8 14H24.2L18.4 30H13.6ZM9.6 5L12 4.4L13.6 13H10.8ZM14.8 2.6H17.2V13H14.8ZM20 4.4L22.4 5L21.2 13H18.4ZM12.6 7.4L14.4 7.2L14.8 13H13Z"/>` },
  science: { d: g24(`<path d="M8.2 1.4H15.8V3.6H14.6V8.6L21.4 20V22.6H2.6V20L9.4 8.6V3.6H8.2Z"/>`), cut: g24(`<circle cx="10.2" cy="18.4" r="1.3"/><circle cx="14" cy="17.2" r="0.9"/>`) },
  dark: { d: g24(`<path d="M13.6 1.6A10.2 10.2 0 1 0 22.4 16.8A8.4 8.4 0 0 1 13.6 1.6ZM19.4 2L20.4 4.6L23 5.6L20.4 6.6L19.4 9.2L18.4 6.6L15.8 5.6L18.4 4.6Z"/>`) },
  goo: { d: g24(`<path d="M12 1.2C12 1.2 4.4 10 4.4 14.8a7.6 7.6 0 0 0 15.2 0C19.6 10 12 1.2 12 1.2Z"/>`) },
  maths: { d: g24(`<path fill-rule="evenodd" d="M2.4 21.6V2.6L21.4 21.6ZM6.4 17.6H12.6L6.4 11.4Z"/>`) },
};
function fold(key, c) {
  const d = FOLD[key];
  if (!d) return '';
  // The clip box is the silhouette's own box, so each fold runs corner to corner.
  return svg(`<g style="fill:${c}">${d.d}</g><g style="fill:${light(c)};clip-path:polygon(0 0, 100% 0, 0 100%)">${d.d}</g>${d.cut ? `<g style="fill:${BG}">${d.cut}</g>` : ''}`);
}

// --- Line -------------------------------------------------------------------
// One round line of one weight, and one filled dot in each icon.
const LINE = {
  eastvan: { d: `<path d="M3 27H29M18 11.4C12.6 11.6 9.4 15 9.4 20.6L5.6 25.2M9.4 20.6C15.4 21.4 21.2 18.2 22 12.6M24.2 8.4L28.2 9.8L24.2 11M13.4 21V26.6M16.8 20.2V26.6"/><circle cx="21" cy="9.4" r="3.4"/>`, dot: [21.4, 9, 1.1] },
  belgian: { d: `<path d="M8 14H24L18.4 29H13.6ZM11.4 10V6M14.6 10V3.6M17.8 10V5.4M21 10V7.4"/>`, dot: [16, 19.6, 1.5] },
  science: { d: `<ellipse cx="16" cy="16" rx="13" ry="5.2"/><ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(-60 16 16)"/>`, dot: [16, 16, 2.3] },
  dark: { d: `<path d="M17.6 4.6A12 12 0 1 0 27.4 20A9.8 9.8 0 0 1 17.6 4.6Z"/>`, dot: [24.6, 7.4, 1.6] },
  goo: { d: `<path d="M16 3.6C16 3.6 7 14 7 19.6a9 9 0 0 0 18 0C25 14 16 3.6 16 3.6Z"/>`, dot: [12.8, 20.4, 1.5] },
  maths: { d: `<path d="M16 16a1.9 1.9 0 0 1 3.8 0a5 5 0 0 1-10 0a8.1 8.1 0 0 1 16.2 0a11.2 11.2 0 0 1-22.4 0"/>`, dot: [16, 16, 1.5] },
};
function line(key, c) {
  const d = LINE[key];
  if (!d) return '';
  return svg(`<g style="fill:none;stroke:${c};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round">${d.d}</g><circle cx="${d.dot[0]}" cy="${d.dot[1]}" r="${d.dot[2]}" style="fill:${light(c)}"/>`);
}

export const SYSTEMS = {
  Tiles: { rule: 'A 6 by 6 mosaic of squares, discs, quarter discs and half squares.', draw: tiles },
  Fold: { rule: 'One solid silhouette; a diagonal fold lights half of it.', draw: fold },
  Line: { rule: 'One round line of one weight, and one filled dot.', draw: line },
};
// The subject of each series icon, the same in every system.
export const SUBJECTS = { eastvan: 'Crow', belgian: 'Frites', science: 'Flask or atom', dark: 'Moon', goo: 'Drip or drop', maths: 'Triangle or spiral' };

// Tom's system pick lives in the browser; no pick means the older icons.
export const SYSTEM_KEY = 'stimming.serieslab.system';
export function systemPick() {
  try { const s = localStorage.getItem(SYSTEM_KEY); return SYSTEMS[s] ? s : null; } catch (e) { return null; }
}
export function saveSystemPick(name) {
  try { name ? localStorage.setItem(SYSTEM_KEY, name) : localStorage.removeItem(SYSTEM_KEY); } catch (e) {}
}
