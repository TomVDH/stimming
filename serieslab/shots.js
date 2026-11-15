// Shots: each icon is a photograph of the place, taken at a Dutch angle.
// A scene is drawn on a 100 x 100 field with wide overscan, then canted.
// The frame stays level; the world inside it leans.
// Each scene is [name, lean direction, draw]; draw gets the kit `k`.
let uid = 0;
const P = pts => 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
const FIELD = 'x="-70" y="-70" width="240" height="240"';

export const SHOTS = {
  eastvan: [
    // Straight up a power pole at dusk: wires to every corner, one crow.
    ['Wires', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.4 0.13 290)'], [0.55, 'oklch(0.68 0.17 20)'], [1, 'oklch(0.88 0.14 80)']])}"/>
      <circle cx="18" cy="92" r="26" fill="oklch(0.95 0.1 90 / 0.35)" filter="${k.blur}"/><circle cx="18" cy="92" r="11" fill="oklch(0.97 0.08 95)"/>
      <g fill="none" stroke="oklch(0.2 0.04 290)" stroke-width="0.9" stroke-linecap="round"><path d="M23 27Q-10 44 -70 34M23 27Q0 2 -30 -70M81 21Q120 34 170 16M81 21Q104 -10 120 -70M32 46Q-10 70 -70 76M73 41Q120 66 170 70M23 27Q60 78 170 110"/></g>
      <path d="${P([[39, 170], [61, 170], [53.5, 6], [47.5, 6]])}" fill="oklch(0.24 0.05 40)"/>
      <path d="${P([[19, 26], [83, 19.5], [83, 24.5], [19, 31]])}M${[[29, 44.5], [75, 40], [75, 44.5], [29, 49]].map(p => p.join(' ')).join('L')}Z" fill="oklch(0.2 0.04 40)"/>
      <path d="M21 21h3.4v6h-3.4zM34 19.6h3.4v6h-3.4zM64 16.6h3.4v6h-3.4zM78 15.2h3.4v6h-3.4z" fill="oklch(0.3 0.05 250)"/>
      <rect x="55" y="50" width="11" height="15" rx="3" fill="oklch(0.22 0.03 270)"/>
      <path d="M57 11C57 5.5 61 3 65.5 3.4C66.6 1 69.8 0.4 71.6 2L75 3L72 4.4C72.2 8.6 69.4 12 65 13.2L55 16.6Z" fill="oklch(0.16 0.04 290)"/>
      <path d="M-8 44.6V56" stroke="oklch(0.9 0.02 90)" stroke-width="0.6"/><path d="M-12 56h6l2 3.4l4.6 1.4v3.4h-12.6z" fill="oklch(0.62 0.2 25)"/>`],
    // A crow fills the frame; the street behind is out of focus.
    ['Crow', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.6 0.11 205)'], [0.6, 'oklch(0.86 0.07 165)'], [1, 'oklch(0.92 0.08 100)']])}"/>
      <g filter="${k.blur}"><path d="M-70 60L-20 44L10 58L40 40L72 56L110 38L170 56V80H-70Z" fill="oklch(0.6 0.07 250)"/>
        <path d="M-70 72H170V170H-70Z" fill="oklch(0.5 0.08 150)"/>
        <path d="M52 76V58L66 49L80 58V76ZM84 76V60L98 52L112 60V76Z" fill="oklch(0.86 0.05 80)"/><path d="M50 59L66 48L82 59ZM82 61L98 51L114 61Z" fill="oklch(0.5 0.1 25)"/>
        <path d="M92 76V10M82 20H102" stroke="oklch(0.35 0.05 50)" stroke-width="2"/></g>
      <path d="M-30 170C-34 110 -8 60 30 44C54 34 74 50 72 72C70 96 50 104 44 130L40 170Z" fill="oklch(0.3 0.09 290)"/>
      <path d="M-20 150C-14 110 6 76 34 62" stroke="oklch(0.42 0.12 290)" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M62 52L104 50L66 76Z" fill="oklch(0.8 0.15 62)"/><path d="M62 52L104 50L64 60Z" fill="oklch(0.88 0.13 75)"/>
      <circle cx="46" cy="55" r="9" fill="oklch(0.98 0.005 90)"/><circle cx="48.6" cy="56.4" r="5.2" fill="oklch(0.12 0.01 275)"/><circle cx="46.4" cy="53.6" r="1.7" fill="white"/>`],
    // The two-floor house from the lawn, low and close.
    ['Special', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.5 0.12 265)'], [0.5, 'oklch(0.76 0.11 330)'], [0.7, 'oklch(0.88 0.1 60)']])}"/>
      <path d="M-70 62L-24 40L4 56L30 36L60 58L96 34L170 60V90H-70Z" fill="oklch(0.5 0.08 265)"/>
      <path d="M-70 14Q50 30 170 8" stroke="oklch(0.22 0.03 280)" stroke-width="0.8" fill="none"/>
      <path d="${P([[21, 40], [79, 40], [82, 67], [18, 67]])}" fill="oklch(0.9 0.04 90)"/><path d="${P([[18, 67], [82, 67], [87, 100], [13, 100]])}" fill="oklch(0.6 0.13 38)"/>
      <path d="${P([[10, 43], [50, 20], [90, 43], [88, 46], [50, 26], [12, 46]])}" fill="oklch(0.36 0.07 290)"/><path d="${P([[14, 44], [50, 24], [86, 44]])}" fill="oklch(0.5 0.08 290)"/>
      <path d="${P([[27, 47], [45, 47], [45.6, 59], [26.4, 59]])}${P([[55, 47], [73, 47], [73.6, 59], [54.4, 59]])}${P([[48, 76], [75, 76], [76.4, 90], [47.4, 90]])}" fill="oklch(0.9 0.15 90)"/>
      <path d="${P([[26, 74], [37, 74], [37, 100], [24.6, 100]])}" fill="oklch(0.55 0.19 25)"/>
      <path d="${P([[14, 64], [86, 64], [86.6, 68.5], [13.4, 68.5]])}" fill="oklch(0.2 0.03 280)"/>
      <path d="M-70 100H170V170H-70Z" fill="oklch(0.56 0.14 150)"/>
      <g filter="${k.blur}" fill="oklch(0.36 0.11 150)"><path d="M-12 170L-6 86L2 170ZM2 170L12 96L18 170ZM78 170L88 92L96 170ZM92 170L104 84L112 170Z"/></g>`],
    // The port at sunset: cranes, a ship, the far shore.
    ['Port', 1, k => `<rect ${FIELD} fill="${k.lin([[0.1, 'oklch(0.45 0.14 300)'], [0.42, 'oklch(0.72 0.18 35)'], [0.54, 'oklch(0.9 0.14 85)']])}"/>
      <circle cx="64" cy="60" r="13" fill="oklch(0.97 0.09 95)"/>
      <path d="M-70 60L-30 44L-4 54L22 40L48 56L80 46L120 58L170 48V62H-70Z" fill="oklch(0.42 0.1 300)"/>
      <rect x="-70" y="60" width="240" height="120" fill="${k.lin([[0, 'oklch(0.62 0.13 40)'], [0.5, 'oklch(0.3 0.08 285)']])}"/>
      <path d="M52 64h24M56 68h18M50 73h30M58 79h14M54 86h22" stroke="oklch(0.95 0.1 90 / 0.7)" stroke-width="1.2" stroke-linecap="round"/>
      <path d="${P([[34, 60], [112, 60], [106, 67], [40, 67]])}" fill="oklch(0.2 0.04 290)"/>
      <path d="M44 55h9v5h-9zM54 51h9v9h-9zM64 55h9v5h-9zM84 53h9v7h-9z" fill="oklch(0.26 0.06 290)"/><path d="M54 51h9v4h-9z" fill="oklch(0.5 0.14 25)"/><path d="M74 55h9v5h-9z" fill="oklch(0.5 0.1 200)"/>
      <g fill="none" stroke="oklch(0.18 0.04 290)" stroke-linecap="round" stroke-linejoin="round"><path d="M8 62V28M28 62V28M8 46H28M2 28H54" stroke-width="2.6"/><path d="M18 28V10M18 10L2 28M18 10L54 28M44 28V40" stroke-width="1.2"/>
        <path d="M-34 62V40M-20 62V40M-38 40H-16L4 14" stroke-width="2.2"/></g>
      <rect x="40" y="40" width="9" height="5" fill="oklch(0.55 0.15 30)"/>
      <path d="M70 170V112Q70 98 86 98T102 112V170Z" fill="oklch(0.14 0.03 290)" filter="${k.blur}"/>`],
    // The corner store at night in the rain; its sign runs down the street.
    ['Neon rain', -1, k => `<rect ${FIELD} fill="oklch(0.19 0.045 282)"/>
      <path d="${P([[-70, -70], [170, -70], [170, 64], [-70, 64]])}" fill="oklch(0.24 0.05 280)"/>
      <path d="${P([[8, 64], [92, 64], [90, 12], [10, 12]])}" fill="oklch(0.32 0.05 275)"/>
      <rect x="20" y="14" width="60" height="13" rx="2" fill="oklch(0.7 0.25 345)" filter="${k.blur}"/><rect x="22" y="16" width="56" height="9" rx="1.5" fill="oklch(0.86 0.17 345)"/>
      <path d="M28 20.5h9M41 20.5h13M58 20.5h14" stroke="oklch(0.99 0.02 345)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="${P([[10, 30], [90, 30], [96, 40], [4, 40]])}" fill="oklch(0.5 0.18 25)"/>
      <rect x="16" y="43" width="42" height="19" fill="oklch(0.9 0.15 92)"/><path d="M20 62v-6a4 4 0 0 1 8 0v6zM31 62v-9a4.5 4.5 0 0 1 9 0v9zM43 62v-5a4 4 0 0 1 8 0v5z" fill="oklch(0.55 0.13 60)"/>
      <rect x="64" y="42" width="15" height="22" fill="oklch(0.14 0.03 280)"/>
      <rect x="-70" y="64" width="240" height="120" fill="oklch(0.16 0.04 285)"/>
      <g filter="${k.blur}"><rect x="24" y="66" width="52" height="60" fill="oklch(0.7 0.25 345 / 0.55)"/><rect x="18" y="66" width="38" height="34" fill="oklch(0.9 0.15 92 / 0.5)"/></g>
      <path d="M-70 78H170M-70 92H170M-70 110H170" stroke="oklch(0.16 0.04 285)" stroke-width="2.4"/>
      <g stroke="oklch(1 0 0 / 0.32)" stroke-width="0.7" stroke-linecap="round">${Array.from({ length: 26 }, (_, i) => { const x = -20 + (i * 37) % 140, y = -10 + (i * 53) % 120; return `<path d="M${x} ${y}l-4 13"/>`; }).join('')}</g>
      <path d="M62 -40A52 52 0 0 1 150 0L100 -6Z" fill="oklch(0.55 0.2 25)" filter="${k.blur}"/>`],
    // Down the alley to the mountains: poles, a bin, a puddle.
    ['Alley', 1, k => `<rect ${FIELD} fill="${k.lin([[0.2, 'oklch(0.72 0.09 235)'], [0.5, 'oklch(0.92 0.05 90)']])}"/>
      <path d="M20 52L38 40L52 50L66 38L84 52Z" fill="oklch(0.6 0.07 255)"/>
      <path d="${P([[-70, 170], [170, 170], [58, 52], [46, 52]])}" fill="oklch(0.45 0.015 275)"/>
      <path d="${P([[-70, -6], [46, 44], [46, 58], [-70, 150]])}" fill="oklch(0.56 0.09 155)"/><path d="${P([[-30, 38], [8, 44], [8, 76], [-30, 104]])}" fill="oklch(0.44 0.08 155)"/>
      <path d="${P([[170, -20], [58, 44], [58, 58], [170, 160]])}" fill="oklch(0.56 0.11 40)"/><path d="${P([[124, 34], [90, 44], [90, 76], [124, 104]])}" fill="oklch(0.86 0.05 85)"/>
      <path d="M52 108Q30 100 34 90Q52 84 70 92Q72 104 52 108Z" fill="oklch(0.82 0.06 220)"/>
      <g stroke="oklch(0.28 0.05 45)" stroke-linecap="round"><path d="M112 130V-30M100 -8H126" stroke-width="3.4"/><path d="M82 86V18M76 26H89" stroke-width="2"/><path d="M68 68V34M64.6 38H71.4" stroke-width="1.2"/></g>
      <path d="M113 -8L82 22L68 36L56 46M113 4L82 28" stroke="oklch(0.25 0.03 280)" stroke-width="0.7" fill="none"/>
      <path d="M-20 170V104Q-20 96 -10 96H22Q30 96 30 104V170Z" fill="oklch(0.3 0.07 155)" filter="${k.blur}"/>
      <circle cx="0" cy="112" r="2.2" fill="oklch(0.95 0.12 100)"/><circle cx="10" cy="112" r="2.2" fill="oklch(0.95 0.12 100)"/>`],
  ],
  belgian: [
    // A cone of frites held up to the lens; the shack behind is a blur.
    ['Cone', 1, k => `<rect ${FIELD} fill="${k.lin([[0.1, 'oklch(0.78 0.03 240)'], [0.6, 'oklch(0.92 0.02 95)']])}"/>
      <g filter="${k.blur}"><rect x="-70" y="66" width="240" height="110" fill="oklch(0.6 0.015 275)"/>
        <rect x="52" y="30" width="64" height="38" fill="oklch(0.95 0.02 95)"/><rect x="52" y="56" width="64" height="12" fill="oklch(0.6 0.2 25)"/><rect x="60" y="20" width="44" height="11" fill="oklch(0.88 0.16 95)"/><rect x="60" y="38" width="38" height="13" fill="oklch(0.3 0.03 275)"/></g>
      <g fill="oklch(0.87 0.15 95)">${[[-26, 30], [-14, 38], [-3, 44], [8, 40], [19, 34], [30, 26]].map(([a, l], i) => `<rect x="${32 + i * 6.4}" y="${52 - l}" width="7.4" height="${l + 6}" rx="1.4" transform="rotate(${a} ${36 + i * 6.4} 52)" fill="${i % 2 ? 'oklch(0.8 0.15 80)' : 'oklch(0.88 0.15 95)'}"/>`).join('')}</g>
      <path d="${P([[24, 50], [78, 50], [62, 132], [42, 132]])}" fill="oklch(0.96 0.015 90)"/><path d="${P([[26.4, 62], [75.6, 62], [73.4, 73], [28.6, 73]])}" fill="oklch(0.6 0.2 25)"/>
      <path d="M52 42C48 30 60 24 66 30C72 22 86 28 82 38C90 40 88 52 80 52H58C50 52 48 46 52 42Z" fill="oklch(0.98 0.03 100)"/><path d="M60 34q4 -4 8 -1" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M30 170V104Q30 92 42 94L68 98Q78 100 76 112L70 170Z" fill="oklch(0.76 0.08 55)"/><path d="M26 96Q24 86 34 86Q42 86 44 96L44 112H28Z" fill="oklch(0.8 0.08 55)"/>`],
    // Stepped gables from the street, with lights strung across.
    ['Gables', -1, k => `<rect ${FIELD} fill="${k.lin([[0.15, 'oklch(0.36 0.1 270)'], [0.6, 'oklch(0.7 0.13 320)']])}"/>
      ${[[-22, 'oklch(0.58 0.13 35)', 30], [4, 'oklch(0.84 0.1 85)', 16], [30, 'oklch(0.7 0.09 20)', 26], [56, 'oklch(0.9 0.04 90)', 12], [82, 'oklch(0.6 0.12 40)', 28]].map(([x, c, top]) =>
    `<path d="M${x} 170V${top + 24}h4v-8h4v-8h4v-8h3v8h4v8h4v8h3V170Z" fill="${c}" transform="translate(0 0)"/><path d="M${x + 5} ${top + 36}h6v10h-6zM${x + 15} ${top + 36}h6v10h-6zM${x + 5} ${top + 54}h6v10h-6zM${x + 15} ${top + 54}h6v10h-6z" fill="oklch(0.3 0.06 265)"/><path d="M${x + 15} ${top + 36}h6v10h-6z" fill="oklch(0.92 0.15 92)"/>`).join('')}
      <path d="M-70 96H170V170H-70Z" fill="oklch(0.3 0.03 275)"/>
      <path d="M-70 22Q50 44 170 14" stroke="oklch(0.2 0.03 280)" stroke-width="0.7" fill="none"/>
      ${Array.from({ length: 11 }, (_, i) => { const x = -30 + i * 16, y = 22 + 22 * (1 - ((x - 50) / 120) ** 2) - 14 + (x - 50) * -0.033; return `<circle cx="${x}" cy="${y.toFixed(1)}" r="4.4" fill="oklch(0.95 0.13 92 / 0.35)" filter="${k.blur}"/><circle cx="${x}" cy="${y.toFixed(1)}" r="1.9" fill="oklch(0.97 0.1 95)"/>`; }).join('')}
      <path d="M-40 170L-6 92L40 170Z" fill="oklch(0.6 0.2 25)" filter="${k.blur}"/><path d="M-22 170L-6 92L10 170Z" fill="oklch(0.95 0.02 90)" filter="${k.blur}"/>`],
    // Cobbles from the ground; a wheel goes by.
    ['Cobbles', 1, k => `<rect ${FIELD} fill="${k.lin([[0.2, 'oklch(0.7 0.02 250)'], [0.42, 'oklch(0.93 0.015 95)']])}"/>
      <path d="M-70 30H170V40H-70Z" fill="oklch(0.6 0.12 140)"/><path d="M14 30V16l2.4 -7l2.4 7V30ZM8 30v-8h18v8Z" fill="oklch(0.36 0.04 275)"/><path d="M40 30q4 -9 9 0ZM52 30q5 -11 11 0ZM-10 30q5 -10 10 0Z" fill="oklch(0.42 0.09 150)"/>
      <rect x="-70" y="36" width="240" height="140" fill="oklch(0.24 0.012 275)"/>
      ${[[36, 3, 6], [40.4, 5, 10], [47, 8, 16], [57, 12, 25], [72, 19, 40], [95, 30, 62]].map(([y, h, w], r) => Array.from({ length: Math.ceil(240 / (w + 1.4)) + 1 }, (_, i) => `<rect x="${(-70 - (r % 2) * w / 2 + i * (w + w * 0.07)).toFixed(1)}" y="${y}" width="${w}" height="${h}" rx="${h * 0.22}" fill="${['oklch(0.62 0.015 275)', 'oklch(0.7 0.03 80)', 'oklch(0.54 0.02 255)', 'oklch(0.66 0.02 60)'][(i * 3 + r * 5) % 4]}"/>`).join('')).join('')}
      <path d="M-70 36H170" stroke="oklch(1 0 0 / 0.25)" stroke-width="0.6"/>
      <g transform="translate(92 26)"><circle r="37" fill="none" stroke="oklch(0.16 0.012 275)" stroke-width="5"/><circle r="32.6" fill="none" stroke="oklch(0.78 0.02 250)" stroke-width="1.4"/>
        <g stroke="oklch(0.82 0.02 250)" stroke-width="0.5">${Array.from({ length: 16 }, (_, i) => `<path d="M0 0L${(32 * Math.cos(i * Math.PI / 8)).toFixed(1)} ${(32 * Math.sin(i * Math.PI / 8)).toFixed(1)}"/>`).join('')}</g><circle r="3.4" fill="oklch(0.3 0.02 275)"/></g>
      <g fill="oklch(0.36 0.04 60)"><circle cx="64" cy="58" r="1.4"/><circle cx="58" cy="52" r="1"/><circle cx="70" cy="50" r="0.8"/></g>`],
    // Up at the steel spheres; the nearest one fills a corner.
    ['Spheres', -1, k => `<rect ${FIELD} fill="${k.lin([[0.1, 'oklch(0.5 0.14 255)'], [0.7, 'oklch(0.8 0.08 220)']])}"/>
      <g fill="oklch(0.97 0.01 240 / 0.8)" filter="${k.blur}"><ellipse cx="84" cy="80" rx="22" ry="6"/><ellipse cx="10" cy="24" rx="16" ry="4.5"/></g>
      <g stroke="oklch(0.62 0.03 250)" stroke-linecap="round"><path d="M26 76L56 44" stroke-width="9"/><path d="M56 44L74 16M56 44L92 52M56 44L30 18" stroke-width="5"/><path d="M74 16L30 18M74 16L92 52" stroke-width="2.6"/></g>
      <g stroke="oklch(0.86 0.02 240)" stroke-linecap="round"><path d="M24 73L54 41" stroke-width="2.4"/><path d="M55 42L73 14M55 42L29 16" stroke-width="1.3"/></g>
      ${[[26, 78, 31], [56, 44, 16], [74, 16, 9], [92, 52, 11], [30, 18, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k.rad([[0, 'oklch(0.98 0.01 240)'], [0.45, 'oklch(0.8 0.03 245)'], [1, 'oklch(0.42 0.05 255)']], 0.34, 0.28, 0.85)}"/><path d="M${x - r * 0.92} ${y + r * 0.1}A${r} ${r * 0.5} 0 0 0 ${x + r * 0.92} ${y + r * 0.1}" fill="none" stroke="oklch(0.55 0.1 250 / 0.5)" stroke-width="${r * 0.14}"/>`).join('')}
      <circle cx="80" cy="12" r="6" fill="oklch(1 0 0 / 0.75)" filter="${k.blur}"/><circle cx="66" cy="30" r="2.4" fill="oklch(1 0.05 95 / 0.5)"/><circle cx="46" cy="56" r="4" fill="oklch(1 0.08 60 / 0.25)"/><circle cx="36" cy="68" r="1.6" fill="oklch(1 0.05 150 / 0.5)"/>`],
    // The canal at dusk: lit windows and their long reflections.
    ['Canal', 1, k => `<rect ${FIELD} fill="${k.lin([[0.1, 'oklch(0.3 0.09 275)'], [0.4, 'oklch(0.56 0.14 330)'], [0.48, 'oklch(0.84 0.13 70)']])}"/>
      ${[[-30, 20, 'oklch(0.3 0.06 300)'], [-8, 12, 'oklch(0.26 0.05 290)'], [14, 22, 'oklch(0.32 0.06 310)'], [36, 14, 'oklch(0.27 0.05 285)'], [58, 24, 'oklch(0.31 0.06 300)'], [80, 16, 'oklch(0.26 0.05 290)'], [102, 22, 'oklch(0.3 0.06 305)']].map(([x, top, c], i) =>
    `<path d="M${x} 48V${top + 12}h3.6v-4h3.6v-4h3.6v-4h2.4v4h3.6v4h3.6v4H${x + 22}V48Z" fill="${c}"/><path d="M${x + 4} ${top + 18}h4.6v6h-4.6zM${x + 13} ${top + 18}h4.6v6h-4.6zM${x + 4} ${top + 28}h4.6v6h-4.6z" fill="${i % 2 ? 'oklch(0.92 0.15 90)' : 'oklch(0.86 0.16 70)'}"/>`).join('')}
      <rect x="-70" y="48" width="240" height="130" fill="${k.lin([[0, 'oklch(0.4 0.1 310)'], [0.35, 'oklch(0.2 0.06 275)']])}"/>
      <g filter="${k.blur}" fill="oklch(0.9 0.15 85 / 0.75)">${[-24, -15, -2, 20, 29, 42, 64, 73, 86, 108].map((x, i) => `<rect x="${x}" y="50" width="4.2" height="${22 + (i * 7) % 16}"/>`).join('')}</g>
      <path d="M-70 60H170M-70 70H170M-70 84H170M-70 102H170" stroke="oklch(0.2 0.06 275)" stroke-width="1.6"/>
      <path d="M60 48Q82 34 104 48" fill="none" stroke="oklch(0.2 0.04 285)" stroke-width="3"/>
      <circle cx="6" cy="18" r="16" fill="oklch(0.95 0.14 90 / 0.4)" filter="${k.blur}"/>
      <path d="M3 170V26h6V170Z" fill="oklch(0.12 0.02 280)"/><path d="M-1 26h14l-3 -10h-8Z" fill="oklch(0.95 0.13 92)"/><path d="M-3 26h18v2.4h-18zM1 14h10l-2 -3h-6Z" fill="oklch(0.12 0.02 280)"/>
      <path d="M-70 128L170 112V122L-70 138Z" fill="oklch(0.12 0.02 280)"/>`],
    // A chalice on a terrace table; the square behind is all lights.
    ['Chalice', -1, k => `<rect ${FIELD} fill="oklch(0.22 0.04 40)"/>
      <g filter="${k.blur}">${[[10, 20, 9, 'oklch(0.85 0.15 85 / 0.6)'], [30, 34, 6, 'oklch(0.7 0.19 30 / 0.6)'], [-6, 44, 7, 'oklch(0.85 0.15 85 / 0.5)'], [84, 14, 10, 'oklch(0.85 0.15 85 / 0.55)'], [98, 40, 7, 'oklch(0.72 0.14 330 / 0.6)'], [22, 6, 5, 'oklch(0.8 0.1 200 / 0.5)'], [70, 34, 5, 'oklch(0.85 0.15 85 / 0.5)'], [112, 22, 8, 'oklch(0.7 0.19 30 / 0.5)']].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('')}</g>
      <path d="M-70 76H170V170H-70Z" fill="${k.lin([[0, 'oklch(0.5 0.09 55)'], [1, 'oklch(0.3 0.06 45)']])}"/><path d="M-70 76H170" stroke="oklch(0.7 0.1 70)" stroke-width="1.2"/>
      <ellipse cx="52" cy="92" rx="26" ry="5" fill="oklch(0.92 0.02 90)"/>
      <path d="M38 92C38 87 46 85.6 52 85.6S66 87 66 92V93.6H38Z" fill="oklch(0.84 0.04 220)"/><rect x="49.6" y="66" width="4.8" height="21" fill="oklch(0.84 0.04 220)"/>
      <path d="M22 26H82C82 50 70 68 52 68S22 50 22 26Z" fill="${k.lin([[0, 'oklch(0.84 0.15 82)'], [1, 'oklch(0.62 0.16 55)']])}"/>
      <path d="M30 34C31 46 36 56 44 62" stroke="oklch(0.97 0.06 90 / 0.8)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g fill="oklch(0.95 0.08 90 / 0.7)"><circle cx="60" cy="46" r="1.2"/><circle cx="66" cy="38" r="0.9"/><circle cx="56" cy="56" r="1"/><circle cx="72" cy="46" r="0.8"/></g>
      <path d="M19 28C14 18 22 9 31 12C34 2 49 0 53 8C59 0 76 2 76 12C86 10 91 20 85 28Z" fill="oklch(0.98 0.02 95)"/><path d="M76 26H86V52a5 5 0 0 1 -10 0Z" fill="oklch(0.98 0.02 95)"/>
      <path d="M26 20q5 -6 11 -3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`],
  ],
};

export const TILTS = { Slight: 7, Dutch: 15, Wild: 26 };
export const FRAMES = ['Print', 'Viewfinder', 'Bare'];

// One icon: key, motif and the knobs { tilt, frame }.
export function shotIcon(key, label, opt) {
  const list = SHOTS[key];
  if (!list) return '';
  const [, dir, draw] = list.find(([l]) => l === label) || list[0];
  const id = 'sh' + (uid++), defs = [];
  const grad = (tag, attrs, stops) => {
    const g = `${id}g${defs.length}`;
    defs.push(`<${tag} id="${g}" ${attrs}>${stops.map(([o, c]) => `<stop offset="${o}" style="stop-color:${c}"/>`).join('')}</${tag}>`);
    return `url(#${g})`;
  };
  const k = {
    blur: `url(#${id}b)`,
    // A top-to-bottom gradient over the shape's own box.
    lin: stops => grad('linearGradient', 'x1="0" y1="0" x2="0" y2="1"', stops),
    rad: (stops, cx, cy, r) => grad('radialGradient', `cx="${cx}" cy="${cy}" r="${r}"`, stops),
  };
  const body = draw(k), ang = dir * (TILTS[opt.tilt] ?? 15);
  const print = opt.frame === 'Print', view = opt.frame === 'Viewfinder';
  const [x, w, rx] = print ? [9, 82, 3] : [3, 94, 9];
  const marks = view ? `<g fill="none" stroke="oklch(1 0 0 / 0.85)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20V10H20M80 10H90V20M90 80V90H80M20 90H10V80"/><path d="M44 50H56M50 44V56" stroke-width="0.8"/></g><circle cx="84" cy="16" r="2" fill="oklch(0.65 0.24 25)"/>` : '';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}c"><rect x="${x}" y="${x}" width="${w}" height="${w}" rx="${rx}"/></clipPath>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" style="stop-color:oklch(0 0 0 / 0)"/><stop offset="1" style="stop-color:oklch(0 0 0 / 0.5)"/></radialGradient>${'DEFS'}</defs>
    ${print ? `<rect x="2" y="2" width="96" height="96" rx="5" style="fill:oklch(0.96 0.012 90)"/>` : ''}
    <g clip-path="url(#${id}c)"><g transform="rotate(${ang} 50 50)">${body}</g><rect x="0" y="0" width="100" height="100" fill="url(#${id}v)"/></g>${marks}</svg>`.replace('DEFS', defs.join(''));
}

// Tom's picks live in the browser.
export const SHOT_KEY = 'stimming.serieslab.shots';
export function shotPicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(SHOT_KEY)) || {}; } catch (e) {}
  return {
    tilt: TILTS[p.tilt] ? p.tilt : 'Dutch', frame: FRAMES.includes(p.frame) ? p.frame : 'Print',
    ...Object.fromEntries(Object.keys(SHOTS).map(key => [key, SHOTS[key].some(([l]) => l === p[key]) ? p[key] : SHOTS[key][0][0]])),
  };
}
export function saveShotPicks(p) {
  try { localStorage.setItem(SHOT_KEY, JSON.stringify(p)); } catch (e) {}
}
