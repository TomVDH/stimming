// Place series icons: free shapes on a 32 x 32 grid, no hex.
// Each shape names a tone (0 to 3) and its own colour.
// Tone 0 is ink or a cutout; 1 is deep; 2 is the body; 3 is light.
// `f` fills a shape; `s` strokes a line of the given width.
export const PLACES = {
  eastvan: [
    // A crow on a wire against the low sun.
    ['Crow', (f, s) => `<circle cx="16" cy="15" r="12" ${f(2, 'oklch(0.78 0.15 55)')}/>
      <path d="M2 27.5H30" ${s(1, 'oklch(0.5 0.03 275)', 1.4)}/><path d="M14 22.4V27.2M17.4 21.4V27.2" ${s(0, 'oklch(0.2 0.03 280)', 1.2)}/>
      <path d="M7 22C7 15 11.5 11 17 11C18 8 21.4 7 23.6 8.8L27.6 10L24 11.6C24.2 16.4 21.4 20.4 16.4 22.4L5 27Z" ${f(0, 'oklch(0.2 0.03 280)')}/>
      <circle cx="21.8" cy="9.9" r="0.9" ${f(3, 'oklch(0.95 0.02 90)')}/>`],
    // The boxy two-floor house: low gable, long balcony, lit windows.
    ['House', (f) => `<path d="M2 13.5L16 6.5L30 13.5Z" ${f(1, 'oklch(0.45 0.05 275)')}/>
      <path d="M4 13.5H28V20.5H4Z" ${f(3, 'oklch(0.88 0.04 90)')}/><path d="M4 20.5H28V27.5H4Z" ${f(2, 'oklch(0.62 0.11 40)')}/>
      <path d="M3 19.4H29V21H3Z" ${f(0, 'oklch(0.25 0.02 275)')}/>
      <path d="M7 15H14V18.4H7ZM18 15H25V18.4H18ZM16 22.6H24.6V25.4H16Z" ${f(0, 'oklch(0.84 0.13 85)')}/>
      <path d="M8 22.4H11.6V27.5H8Z" ${f(0, 'oklch(0.5 0.15 25)')}/>`],
    // An alley pole: two arms, insulators, a can, sagging wires.
    ['Power pole', (f, s) => `<path d="M0 9.6Q4 9.6 6.8 5M32 9.6Q28 9.6 25.2 5M0 15Q5 15 8.8 12.2M32 15Q27 15 23.2 12.2" ${s(3, 'oklch(0.75 0.03 250)', 1)}/>
      <path d="M14.9 3H17.1V30H14.9Z" ${f(1, 'oklch(0.52 0.07 60)')}/>
      <path d="M5 7H27V9H5ZM8 12H24V13.8H8Z" ${f(2, 'oklch(0.68 0.08 65)')}/>
      <path d="M6 4.8H7.6V7H6ZM11 4.8H12.6V7H11ZM19.4 4.8H21V7H19.4ZM24.4 4.8H26V7H24.4Z" ${f(3, 'oklch(0.86 0.05 200)')}/>
      <rect x="18" y="15" width="4.8" height="6.2" rx="1" ${f(2, 'oklch(0.62 0.02 250)')}/>`],
    // A port crane with one box on the hook.
    ['Port crane', (f, s) => `<path d="M1 29.2H31" ${s(1, 'oklch(0.55 0.07 235)', 1.6)}/>
      <path d="M16 3.6L4 10.4M16 3.6L28 10.4M25 12V19" ${s(1, 'oklch(0.5 0.12 35)', 1)}/>
      <path d="M9 28.4V12H11V28.4ZM19 28.4V12H21V28.4ZM9 19.6H21V21.4H9ZM3 10H29V12.2H3ZM14.8 10L15.2 3H16.8L17.2 10Z" ${f(2, 'oklch(0.68 0.19 35)')}/>
      <path d="M12 12.2H18V15.4H12Z" ${f(1, 'oklch(0.52 0.15 32)')}/>
      <path d="M22 19H28V22.6H22Z" ${f(3, 'oklch(0.74 0.12 230)')}/>`],
    // A pair of trainers on the wire.
    ['Shoes', (f, s) => `<path d="M1 6.4Q16 12.4 31 5.4" ${s(1, 'oklch(0.5 0.03 275)', 1.3)}/>
      <path d="M13.4 9.4L10.4 15M17.2 9.6L21 17" ${s(3, 'oklch(0.9 0.02 90)', 1)}/>
      <g transform="translate(13.2 14.4) rotate(118)"><path d="M0 7V3.8C0 2.8 1 2.2 2 2.8L5 4.4L6.2 0H10.4C11.4 0 12 0.8 12 1.8V7Z" ${f(2, 'oklch(0.65 0.2 25)')}/><path d="M-0.4 6.6H12.4V8.6H-0.4Z" ${f(3, 'oklch(0.95 0.01 90)')}/></g>
      <g transform="translate(24.4 16.6) rotate(100)"><path d="M0 7V3.8C0 2.8 1 2.2 2 2.8L5 4.4L6.2 0H10.4C11.4 0 12 0.8 12 1.8V7Z" ${f(3, 'oklch(0.9 0.02 90)')}/><path d="M-0.4 6.6H12.4V8.6H-0.4Z" ${f(1, 'oklch(0.55 0.12 250)')}/></g>`],
    // Roofs under the North Shore peaks.
    ['North Shore', (f) => `<path d="M1 25L9 11.4L13 16.6L19.4 6.6L31 25Z" ${f(1, 'oklch(0.5 0.07 255)')}/>
      <path d="M19.4 6.6L22.2 11L19.8 10.2L18 11.8L16.8 10.6ZM9 11.4L11 14L9.2 13.4L7.6 14.2Z" ${f(3, 'oklch(0.96 0.01 240)')}/>
      <path d="M1 28.4V23.6L4 21L7 23.6V24.6H9V22L12.5 19.4L16 22V24.6H18V23L21 20.4L24 23V24.6H26V22.6L28.5 20.6L31 22.6V28.4Z" ${f(2, 'oklch(0.78 0.11 60)')}/>`],
  ],
  belgian: [
    // A paper cone of frites with a blob of mayonnaise.
    ['Frites', (f) => `<path d="M9.6 5L12 4.4L13.6 13H10.8ZM14.8 2.6H17.2V13H14.8ZM20 4.4L22.4 5L21.2 13H18.4ZM12.6 7.4L14.4 7.2L14.8 13H13Z" ${f(2, 'oklch(0.86 0.15 88)')}/>
      <path d="M7.8 14H24.2L18.4 30H13.6Z" ${f(3, 'oklch(0.93 0.03 90)')}/>
      <path d="M9.4 17.4H22.6L21.8 20H10.2Z" ${f(0, 'oklch(0.6 0.2 28)')}/>
      <path d="M17.4 8C19.6 7 21.6 9 20.6 10.8C22 11.4 21.6 13 20.4 13H16.6C15 13 15.4 9.4 17.4 8Z" ${f(3, 'oklch(0.97 0.03 100)')}/>`],
    // The flag as three plain bars.
    ['Tricolour', (f) => `<path d="M7 7H11.6V25H7A3 3 0 0 1 4 22V10A3 3 0 0 1 7 7Z" ${f(1, 'oklch(0.36 0.012 275)')}/>
      <path d="M12.4 7H19.6V25H12.4Z" ${f(3, 'oklch(0.88 0.17 95)')}/>
      <path d="M20.4 7H25A3 3 0 0 1 28 10V22A3 3 0 0 1 25 25H20.4Z" ${f(2, 'oklch(0.6 0.21 28)')}/>`],
    // Steel spheres on tubes.
    ['Spheres', (f, s) => `<path d="M16 4V28M6 10.4L26 21.6M26 10.4L6 21.6M6 10.4L16 4L26 10.4V21.6L16 28L6 21.6Z" ${s(1, 'oklch(0.55 0.02 250)', 1.2)}/>
      <circle cx="16" cy="16" r="3.6" ${f(3, 'oklch(0.86 0.02 250)')}/>
      <g ${f(2, 'oklch(0.76 0.02 250)')}><circle cx="16" cy="4" r="2.9"/><circle cx="16" cy="28" r="2.9"/><circle cx="6" cy="10.4" r="2.9"/><circle cx="26" cy="10.4" r="2.9"/><circle cx="6" cy="21.6" r="2.9"/><circle cx="26" cy="21.6" r="2.9"/></g>`],
    // A beer chalice with a head of foam.
    ['Chalice', (f, s) => `<path d="M15 16.6H17V25.4H15ZM9.6 28.4V27.6C9.6 25.8 12.6 25 16 25S22.4 25.8 22.4 27.6V28.4Z" ${f(3, 'oklch(0.8 0.03 230)')}/>
      <path d="M8 8.6H24C23.6 13.8 21 17.4 16 17.4C11 17.4 8.4 13.8 8 8.6Z" ${f(2, 'oklch(0.76 0.15 70)')}/>
      <path d="M7 5.6C7 3.2 9 2.6 10.6 3.4C11.6 1.8 14.4 1.6 15.6 3C17 1.6 20 1.8 20.8 3.4C22.6 2.6 25 3.2 25 5.6V7.6H7Z" ${f(3, 'oklch(0.97 0.02 95)')}/>
      <path d="M10.9 10.6C11.2 12.4 12 13.8 13.2 14.8" ${s(3, 'oklch(0.92 0.08 85)', 1.2)}/>`],
    // A waffle: nine pockets.
    ['Waffle', (f) => `<rect x="4" y="4" width="24" height="24" rx="5" ${f(2, 'oklch(0.8 0.13 78)')}/>
      <g ${f(0, 'oklch(0.62 0.13 60)')}>${[6.6, 13.6, 20.6].map(y => [6.6, 13.6, 20.6].map(x => `<rect x="${x}" y="${y}" width="4.8" height="4.8" rx="1"/>`).join('')).join('')}</g>`],
    // The weather: one cloud, rain in the three colours.
    ['Drizzle', (f, s) => `<path d="M9 19C5.6 19 4 16.4 5 13.8C5.8 11.6 8 10.8 9.8 11.4C10.6 7.6 14.6 5.6 18 7.2C20.2 8.2 21.4 10.2 21.4 12C24.6 11.4 27.4 13.6 27.2 16.2C27 18 25.4 19 23.6 19Z" ${f(3, 'oklch(0.84 0.02 250)')}/>
      <path d="M10.2 22.4L8.6 27.6" ${s(1, 'oklch(0.42 0.012 275)', 2.4)}/><path d="M16.6 22.4L15 27.6" ${s(2, 'oklch(0.88 0.17 95)', 2.4)}/><path d="M23 22.4L21.4 27.6" ${s(2, 'oklch(0.6 0.21 28)', 2.4)}/>`],
  ],
};

// Three treatments of one drawing.
// Colour: each shape keeps its own colour.
// Tones: four steps of the series colour.
// Solid: one colour; tone 0 cuts through to the page.
export const TREATMENTS = ['Colour', 'Tones', 'Solid'];
const BG = 'oklch(0.16 0.012 275)';
const paint = (treatment, c) => (tone, own) => {
  if (treatment === 'Tones') return [`color-mix(in oklch, ${c} 24%, black)`, `color-mix(in oklch, ${c} 58%, black)`, c, `color-mix(in oklch, ${c} 45%, white)`][tone];
  if (treatment === 'Solid') return tone === 0 ? BG : c;
  return own;
};

export function placeIcon(key, label, treatment, c) {
  const list = PLACES[key];
  if (!list) return '';
  const draw = (list.find(([l]) => l === label) || list[0])[1], k = paint(treatment, c);
  const f = (tone, own) => `style="fill:${k(tone, own)}"`;
  const s = (tone, own, w) => `style="fill:none;stroke:${k(tone, own)};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"`;
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${draw(f, s)}</svg>`;
}

// Tom's picks live in the browser; the first motif in Colour is the default.
export const PLACE_KEY = 'stimming.serieslab.places';
export function placePicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PLACE_KEY)) || {}; } catch (e) {}
  return Object.fromEntries(Object.keys(PLACES).map(k => [k, { m: p[k]?.m || PLACES[k][0][0], t: TREATMENTS.includes(p[k]?.t) ? p[k].t : 'Colour' }]));
}
export function savePlacePick(key, pick) {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PLACE_KEY)) || {}; } catch (e) {}
  p[key] = pick;
  try { localStorage.setItem(PLACE_KEY, JSON.stringify(p)); } catch (e) {}
}
