// Funk icons: chunky pieces on a 48 x 48 grid; every piece sits askew.
// A piece is [cx, cy, tilt, shear, body]; the body draws around 0,0.
// The wonk knob scales every tilt and shear.
// Colours: A, B, C are the icon's own; W white, M cream, G grey, K ink.
const F = c => `style="fill:${c}"`;
const S = (c, w) => `style="fill:none;stroke:${c};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"`;

export const FUNK = {
  eastvan: [
    // A fat crow with a huge beak and a side-eye.
    ['Crow', ['oklch(0.52 0.15 290)', 'oklch(0.8 0.15 62)', 'oklch(0.4 0.13 290)'], k => [
      [0, 0, 0, 0, `<path d="M2 43Q14 46.5 24 43T46 42" ${S(k.G, 1.6)}/>`],
      [18, 36, -6, 0, `<path d="M-3 0L-5 7.4M4 0L5.4 7" ${S(k.B, 2.2)}/>`],
      [18, 27, -10, 0, `<path d="M-13 3C-13 -7 -4 -12 5 -9C11 -7 13 -1 11 5C9 11 -1 13 -8 11L-19 15Z" ${F(k.A)}/><path d="M-8 2C-4 -4 6 -4 8 2C4 7 -4 7 -8 2Z" ${F(k.C)}/>`],
      [28, 14, 8, 0, `<circle r="8.5" ${F(k.A)}/>${k.eye(1, -2, 3.9, -0.4, 0.3, true)}`],
      [34.5, 15, 14, 0, `<path d="M0 -4.6L11.5 1L0 5.6Z" ${F(k.B)}/>`],
    ]],
    // A skunk, tail up, with a whiff.
    ['Skunk', ['oklch(0.45 0.05 300)', 'oklch(0.82 0.11 345)', 'oklch(0.78 0.16 150)'], k => [
      [0, 0, 0, 0, `<path d="M29 15q2.4 -3 0 -6t0 -6M35 17q2.4 -3 0 -6" ${S(k.C, 1.6)}/><path d="M19 38V43.4M31 38V43.4" ${S(k.A, 3.2)}/>`],
      [13, 21, -12, 0, `<path d="M2 16C-9 8 -10 -9 0 -14C9 -18 16 -9 11 -3C9 0 5 -1 5 -5C1 -2 3 6 8 12Z" ${F(k.A)}/><path d="M1.6 10C-4.6 4 -6 -7 1 -10C6 -12 9.6 -7.6 7 -5.6C3 -7 0.4 -1 3.6 8Z" ${F(k.W)}/>`],
      [26, 33, 4, 0, `<ellipse rx="12" ry="7.5" ${F(k.A)}/><path d="M-11 -3C-4 -8 6 -8 12 -3L11 -0.4C5 -4.6 -4 -4.6 -10 -0.4Z" ${F(k.W)}/>`],
      [38, 34, 10, 0, `<path d="M-6 -5.4C0 -7.4 7 -3 9 2C5 5.4 -3 6.4 -6 4Z" ${F(k.A)}/><circle cx="9" cy="2" r="1.5" ${F(k.B)}/>${k.eye(1.6, -1.6, 2.7, 0.3, 0.1, true)}`],
    ]],
    // An umbrella blown inside out.
    ['Umbrella', ['oklch(0.7 0.19 32)', 'oklch(0.86 0.15 100)', 'oklch(0.72 0.14 255)'], k => [
      [0, 0, 0, 0, `<path d="M7 5L4 12M41 23L38 30M11 31L8 38M43 5L40 12M35 37L32 44" ${S(k.C, 2)}/>`],
      [24, 27, -6, 0, `<path d="M0 -1V12a3.5 3.5 0 0 0 7 0" ${S(k.W, 2.6)}/>`],
      [24, 18, 16, 0, `<path d="M0 8L-18 -4L-10 -11Z" ${F(k.A)}/><path d="M0 8L-10 -11L3 -14Z" ${F(k.B)}/><path d="M0 8L3 -14L15 -8Z" ${F(k.A)}/><path d="M0 8L15 -8L20 1Z" ${F(k.B)}/>${k.eye(-6, -4, 3)}${k.eye(4, -5, 3)}`],
    ]],
    // The boxy two-floor house, leaning hard.
    ['House', ['oklch(0.72 0.2 318)', 'oklch(0.7 0.19 32)', 'oklch(0.86 0.15 100)'], k => [
      [24, 31, 0, -10, `<rect x="-15" y="-9" width="30" height="18" ${F(k.W)}/><rect x="-15" y="0" width="30" height="9" ${F(k.B)}/><rect x="-17" y="-1.2" width="34" height="2.4" ${F(k.K)}/>
        <rect x="-11" y="-7.4" width="8" height="5" ${F(k.C)}/><rect x="3" y="-7.4" width="8" height="5" ${F(k.C)}/><rect x="1" y="3" width="10" height="3.6" ${F(k.C)}/><rect x="-9" y="2.6" width="5" height="6.4" ${F(k.A)}/>${k.eye(-7, -4.9, 3)}${k.eye(7, -4.9, 3)}`],
      [26, 18.6, 6, 0, `<path d="M-19 5L1 -7L19 5Z" ${F(k.A)}/>`],
    ]],
    // A pole that leans, arms every way, one shoe on the wire.
    ['Pole', ['oklch(0.6 0.09 60)', 'oklch(0.76 0.1 68)', 'oklch(0.7 0.19 32)'], k => [
      [0, 0, 0, 0, `<path d="M0 12Q5 15.6 9 13M48 5Q42 12 37 8.6M0 23Q8 25 14 18M48 21Q40 26 34 20" ${S(k.G, 1.2)}/><path d="M6 14.6V22" ${S(k.W, 1)}/>`],
      [6, 25, 24, 0, `<path d="M-4 -3H0L1.6 -0.4L5 1V3.6H-4Z" ${F(k.C)}/><path d="M-4.4 3H5.4V4.6H-4.4Z" ${F(k.W)}/>`],
      [24, 26, 7, 0, `<rect x="-1.7" y="-22" width="3.4" height="44" ${F(k.A)}/>`],
      [23, 11, -9, 0, `<rect x="-15" y="-1.3" width="30" height="2.6" ${F(k.B)}/><path d="M-13 -4.2h2v3h-2zM-6 -4.2h2v3h-2zM4 -4.2h2v3h-2zM11 -4.2h2v3h-2z" ${F(k.W)}/>`],
      [24.6, 18, 12, 0, `<rect x="-10" y="-1.2" width="20" height="2.4" ${F(k.B)}/>`],
      [29.6, 26, -14, 0, `<rect x="-3.2" y="-4.4" width="6.4" height="8.8" rx="1.6" ${F(k.G)}/>${k.eye(0, -0.6, 2.6)}`],
    ]],
    // A port crane on splayed legs; its box swings.
    ['Crane', ['oklch(0.7 0.19 32)', 'oklch(0.72 0.14 255)', 'oklch(0.5 0.15 30)'], k => [
      [0, 0, 0, 0, `<path d="M2 45.4q4 -2.4 8 0t8 0t8 0t8 0t8 0" ${S(k.B, 1.6)}/><path d="M18 6L44 16.4M18 6L4 25.4M38 18.6L41 29" ${S(k.C, 1.1)}/>`],
      [20, 33, -4, 0, `<path d="M-9 11L-5 -9H-2L-5 11ZM9 11L5 -9H2L5 11ZM-6 1.6H6V4H-6Z" ${F(k.A)}/>`],
      [19, 14, -6, 0, `<path d="M-1.8 7L-1.1 -9H1.1L1.8 7Z" ${F(k.A)}/>${k.eye(0, -6, 2.8)}`],
      [24, 21, -12, 0, `<rect x="-22" y="-1.7" width="44" height="3.4" ${F(k.A)}/><rect x="-7" y="1.7" width="9" height="4" ${F(k.C)}/>`],
      [41.5, 32, 18, 0, `<rect x="-5.5" y="-3" width="11" height="6" ${F(k.B)}/><path d="M-2 -3V3M1.6 -3V3" ${S(k.K, 0.8)}/>`],
    ]],
  ],
  belgian: [
    // Frites that burst out of the cone, under too much mayonnaise.
    ['Frites', ['oklch(0.87 0.15 95)', 'oklch(0.66 0.2 28)', 'oklch(0.79 0.15 78)'], k => [
      ...[[15, 23, -28, k.A], [19.5, 22, -13, k.C], [24, 21, 1, k.A], [28.5, 22, 14, k.C], [33, 23, 27, k.A]].map(([x, y, r, c]) => [x, y, r, 0, `<rect x="-1.9" y="-17" width="3.8" height="19" rx="0.6" ${F(c)}/>`]),
      [24, 33, -5, 0, `<path d="M-12 -11H12L3.5 12H-3.5Z" ${F(k.W)}/><path d="M-10.6 -7.4H10.6L9.2 -3.6H-9.2Z" ${F(k.B)}/>${k.eye(-4, 1, 2.8)}${k.eye(3.6, 1, 2.8)}`],
      [27, 19, 8, 0, `<path d="M-7 2C-9 -3 -4 -7 0 -5C3 -9 10 -6 8 -1C11 1 9 5 6 4.6V9a1.6 1.6 0 0 1-3.2 0V5H-3C-6 5.4 -8 4 -7 2Z" ${F(k.M)}/>`],
    ]],
    // The little fountain boy and his long arc.
    ['Fountain', ['oklch(0.7 0.11 65)', 'oklch(0.78 0.12 220)', 'oklch(0.6 0.02 275)'], k => [
      [0, 0, 0, 0, `<path d="M19 27Q32 6 43 38" ${S(k.B, 2.6)} stroke-dasharray="0.1 4.6"/><path d="M41 41.4l-3 2M45 41.4l3 2M43 43.4v3" ${S(k.B, 1.6)}/><path d="M11 35V29M16.4 35V29" ${S(k.A, 3.2)}/><path d="M16.6 22L20 26.4" ${S(k.A, 2.6)}/>`],
      [13.6, 40, 3, 0, `<rect x="-8" y="-5" width="16" height="10" rx="1.6" ${F(k.C)}/>`],
      [14, 24, -14, 0, `<rect x="-5" y="-7" width="10" height="13.4" rx="4.6" ${F(k.A)}/>`],
      [11.5, 12.5, -10, 0, `<circle r="6.2" ${F(k.A)}/><path d="M-2 -6q2.4 -3.4 4.6 -1" ${S(k.A, 1.8)}/>${k.eye(2, -0.6, 2.5, 0.35, 0.1, true)}`],
    ]],
    // A waffle with a bite gone and chocolate on top.
    ['Waffle', ['oklch(0.83 0.13 80)', 'oklch(0.44 0.08 45)', 'oklch(0.65 0.13 62)'], k => [
      [0, 0, 0, 0, `<rect x="40" y="5" width="2.6" height="2.6" transform="rotate(20 41 6)" ${F(k.A)}/><rect x="44" y="13" width="2" height="2" transform="rotate(-15 45 14)" ${F(k.A)}/>`],
      [23, 25, 13, -6, `<mask id="${k.bite = k.id()}" maskUnits="userSpaceOnUse" x="-20" y="-24" width="44" height="48"><rect x="-20" y="-24" width="44" height="48" fill="white"/><circle cx="14.6" cy="-14.6" r="6.4"/><circle cx="7" cy="-16.4" r="3.4"/><circle cx="16.4" cy="-7" r="3.4"/></mask><g mask="url(#${k.bite})"><rect x="-15" y="-15" width="30" height="30" rx="6" ${F(k.A)}/>${[-11, -3, 5].map(y => [-11, -3, 5].map(x => `<rect x="${x}" y="${y}" width="6" height="6" rx="1.2" ${F(k.C)}/>`).join('')).join('')}
        <path d="M-15 -8V-11A4 4 0 0 1 -11 -15H3C3 -11 -0.6 -11 -0.6 -8.4C-0.6 -5.6 -4.4 -5.6 -4.4 -9C-4.4 -11 -7 -11 -7 -8V-2a2 2 0 0 1 -4 0V-9C-11 -11 -15 -11 -15 -8Z" ${F(k.B)}/>
        </g>${k.eye(-4, 3, 3.1)}${k.eye(5, 3, 3.1)}`],
    ]],
    // A chalice that tips; the foam runs over.
    ['Chalice', ['oklch(0.77 0.15 70)', 'oklch(0.9 0.08 85)', 'oklch(0.82 0.04 220)'], k => [
      [0, 0, 0, 0, `<circle cx="40.6" cy="34" r="1.7" ${F(k.M)}/>`],
      [21.6, 42, -4, 0, `<path d="M-9 2C-9 -1 -4 -2.4 0 -2.4S9 -1 9 2V3H-9Z" ${F(k.C)}/>`],
      [22.4, 34.6, 5, 0, `<rect x="-1.5" y="-6" width="3" height="12" ${F(k.C)}/>`],
      [24, 20, 13, 0, `<path d="M-12 -7H12C12 2 7 9.5 0 9.5S-12 2 -12 -7Z" ${F(k.A)}/><path d="M-8.6 -3C-8 1 -6 4.6 -3 6.4" ${S(k.B, 1.4)}/>${k.eye(-2.6, 0, 2.8)}${k.eye(4.6, 0, 2.8)}`],
      [25.6, 11.4, 13, 0, `<path d="M-13 3C-15 -1 -12 -5 -8 -4C-7 -8 -1 -9 1 -6C4 -9 10 -8 10 -4C14 -4 15 1 13 3Z" ${F(k.M)}/><path d="M9.6 2H14V13a2.2 2.2 0 0 1 -4.4 0Z" ${F(k.M)}/>`],
    ]],
    // Steel spheres on tubes; no two the same size.
    ['Spheres', ['oklch(0.85 0.03 240)', 'oklch(0.72 0.2 318)', 'oklch(0.58 0.03 250)'], k => [
      [24, 24, 17, 0, `<path d="M0 -17V17M-15 -8.5L15 8.5M15 -8.5L-15 8.5M-15 -8.5L0 -17L15 -8.5V8.5L0 17L-15 8.5Z" ${S(k.C, 1.6)}/>
        ${[[0, 0, 6.2, k.A], [0, -17, 4.4, k.A], [0, 17, 3, k.A], [-15, -8.5, 3.4, k.A], [15, -8.5, 5.2, k.B], [-15, 8.5, 4.8, k.A], [15, 8.5, 3.2, k.A]].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" ${F(c)}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.22}" ${F(k.W)}/>`).join('')}${k.eye(-2.2, 0.4, 2.4)}${k.eye(2.8, 0.4, 2.4)}`],
    ]],
    // A saxophone, and two notes that got out.
    ['Sax', ['oklch(0.83 0.15 88)', 'oklch(0.92 0.1 95)', 'oklch(0.72 0.2 318)'], k => [
      [0, 0, 0, 0, `<ellipse cx="37" cy="15" rx="2.7" ry="2.1" transform="rotate(-20 37 15)" ${F(k.C)}/><path d="M39.4 14V6l4 1.8" ${S(k.C, 1.7)}/><ellipse cx="42" cy="27" rx="2.2" ry="1.7" transform="rotate(-20 42 27)" ${F(k.C)}/><path d="M44 26.2V20" ${S(k.C, 1.5)}/>`],
      [21, 25, -14, 0, `<path d="M-7 -17L-12.4 -21.4" ${S(k.G, 3)}/><path d="M-7 -17L-2 8a7.5 7.5 0 0 0 14 2L13.6 4" ${S(k.A, 5.6)}/><ellipse cx="14.4" cy="1" rx="6.4" ry="3.2" transform="rotate(-14 14.4 1)" ${F(k.B)}/>
        <circle cx="-5.2" cy="-8" r="1.5" ${F(k.W)}/><circle cx="-3.9" cy="-2" r="1.5" ${F(k.W)}/><circle cx="-2.7" cy="4" r="1.5" ${F(k.W)}/>${k.eye(4, 13, 2.6)}${k.eye(9.6, 12.4, 2.6)}`],
    ]],
  ],
};

export const WONK = { Mild: 0.45, Wonky: 1, Unhinged: 1.7 };
export const PALETTES = ['Party', 'Series'];
// Forms: Flat is the plain drawing; the others give it depth.
// Shaded: a soft top-left light makes the shapes puffy and glossy.
// Slab: the drawing is a thick cut-out with a dark side.
// Block: the shaded drawing stands on an isometric block in the series colour.
// Cube: the drawing sits on the left face of an isometric cube.
export const FORMS = ['Flat', 'Shaded', 'Slab', 'Block', 'Cube'];
let uid = 0;
const mix = (c, pct, to) => `color-mix(in oklch, ${c} ${pct}%, ${to})`;
// The menu light: from the top left, as on the toy icons.
const gloss = id => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="b"/>
  <feDiffuseLighting in="b" surfaceScale="3.2" diffuseConstant="1.15" lighting-color="white" result="d"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit"/>
  <feSpecularLighting in="b" surfaceScale="3.2" specularConstant="0.7" specularExponent="22" lighting-color="white" result="s"><feDistantLight azimuth="225" elevation="52"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
  <feComposite in="s2" in2="lit" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
</filter>`;
// An isometric face set: light top, mid left, dark right, a rim on the top edges.
const faces = (top, left, right, rim, cols) => `<path d="${top}" ${F(cols[0])}/><path d="${left}" ${F(cols[1])}/><path d="${right}" ${F(cols[2])}/><path d="${rim}" ${S('oklch(1 0 0 / 0.6)', 0.8)}/>`;
function form(inner, name, c) {
  const id = 'fk' + (uid++);
  if (name === 'Shaded') return `<defs>${gloss(id)}</defs><g filter="url(#${id})">${inner}</g>`;
  if (name === 'Slab') {
    const D = 5, N = 10;
    return `<defs><g id="${id}">${inner}</g></defs><g transform="translate(0 ${-D / 2})"><g style="filter:brightness(0.48) saturate(1.2)">${Array.from({ length: N }, (_, i) => `<use href="#${id}" y="${(i + 1) * D / N}"/>`).join('')}</g><use href="#${id}"/></g>`;
  }
  if (name === 'Block') {
    const block = faces('M24 24.4L41 34.2L24 44L7 34.2Z', 'M7 34.2L24 44V48L7 38.2Z', 'M24 44L41 34.2V38.2L24 48Z', 'M7 34.2L24 44L41 34.2', [c, mix(c, 60, 'black'), mix(c, 36, 'black')]);
    return `${block}<ellipse cx="24" cy="35.6" rx="9" ry="3.4" ${F('oklch(0 0 0 / 0.28)')}/><defs>${gloss(id)}</defs><g transform="translate(24 37) scale(0.7) translate(-24 -46)" filter="url(#${id})">${inner}</g>`;
  }
  if (name === 'Cube') {
    const dark = 'oklch(0.13 0.012 275)';
    const cube = faces('M24 0L44.8 12L24 24L3.2 12Z', 'M3.2 12L24 24V48L3.2 36Z', 'M24 24L44.8 12V36L24 48Z', 'M3.2 12L24 24L44.8 12M24 24V48', [c, mix(c, 34, dark), mix(c, 16, dark)]);
    return `<g transform="translate(24 24) scale(0.94) translate(-24 -24)">${cube}<g transform="matrix(0.4333 0.25 0 0.5 3.2 12) translate(24 24) scale(0.84) translate(-24 -24)">${inner}</g></g>`;
  }
  return inner;
}

// One icon: key, motif, and the knobs { form, wonk, pal, eyes }, plus the series colour.
export function funkIcon(key, label, opt, c) {
  const list = FUNK[key];
  if (!list) return '';
  const [, own, parts] = list.find(([l]) => l === label) || list[0];
  const w = WONK[opt.wonk] ?? 1, series = opt.pal === 'Series';
  const k = {
    A: series ? c : own[0],
    B: series ? `color-mix(in oklch, ${c} 45%, white)` : own[1],
    C: series ? `color-mix(in oklch, ${c} 58%, black)` : own[2],
    W: 'oklch(0.96 0.01 90)', M: 'oklch(0.97 0.03 100)', G: 'oklch(0.58 0.03 275)', K: 'oklch(0.2 0.02 275)',
    // A fresh id, for a mask that cuts a real hole.
    id: () => 'fm' + (uid++),
    // A googly eye; an animal keeps its eye when the knob is off.
    eye: (x, y, r, dx = 0.3, dy = 0.25, always = false) => (opt.eyes || always)
      ? `<circle cx="${x}" cy="${y}" r="${r}" ${F('oklch(0.98 0.005 90)')}/><circle cx="${x + dx * r}" cy="${y + dy * r}" r="${r * 0.55}" ${F('oklch(0.14 0.01 275)')}/>` : '',
  };
  const body = parts(k).map(([x, y, rot, sk, d]) => `<g transform="translate(${x} ${y}) rotate(${rot * w}) skewX(${sk * w})">${d}</g>`).join('');
  const inner = `<g transform="translate(24 24) skewX(${-5 * w}) translate(-24 -24)">${body}</g>`;
  return `<svg viewBox="0 0 48 48" aria-hidden="true" style="overflow:visible">${form(inner, opt.form, c)}</svg>`;
}

// Tom's picks live in the browser.
export const FUNK_KEY = 'stimming.serieslab.funk';
export function funkPicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(FUNK_KEY)) || {}; } catch (e) {}
  return {
    form: FORMS.includes(p.form) ? p.form : 'Flat', wonk: WONK[p.wonk] ? p.wonk : 'Wonky', pal: PALETTES.includes(p.pal) ? p.pal : 'Party', eyes: !!p.eyes,
    ...Object.fromEntries(Object.keys(FUNK).map(key => [key, FUNK[key].some(([l]) => l === p[key]) ? p[key] : FUNK[key][0][0]])),
  };
}
export function saveFunkPicks(p) {
  try { localStorage.setItem(FUNK_KEY, JSON.stringify(p)); } catch (e) {}
}
