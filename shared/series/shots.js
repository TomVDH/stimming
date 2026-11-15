// Series icons. Each one is a shot of its subject, taken at a Dutch angle.
// Tom's picks (2026-11-15): the Hex ring crop, the outline in the series colour.
// A scene is drawn on a 100 x 100 field with wide overscan, then canted.
// The frame stays level; the world inside it leans.
// Each scene is [name, lean direction, draw]; draw gets the kit `k`.
let uid = 0;
const P = pts => 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
const FIELD = 'x="-70" y="-70" width="240" height="240"';
// The silhouette ink: one dark tone for every shape against the sky.
const SIL = 'oklch(0.2 0.045 282)';

export const SHOTS = {
  eastvan: [
    // Straight up a power pole at dusk: wires to every corner. No birds (Tom, 2026-11-15).
    ['Wires', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.4 0.13 290)'], [0.55, 'oklch(0.68 0.17 20)'], [1, 'oklch(0.88 0.14 80)']])}"/>
      <circle cx="18" cy="92" r="26" fill="oklch(0.95 0.1 90 / 0.35)" filter="${k.blur}"/><circle cx="18" cy="92" r="11" fill="oklch(0.97 0.08 95)"/>
      <g fill="none" stroke="oklch(0.2 0.04 290)" stroke-width="0.9" stroke-linecap="round"><path d="M23 27Q-10 44 -70 34M23 27Q0 2 -30 -70M81 21Q120 34 170 16M81 21Q104 -10 120 -70M32 46Q-10 70 -70 76M73 41Q120 66 170 70M23 27Q60 78 170 110"/></g>
      <path d="${P([[39, 170], [61, 170], [53.5, 6], [47.5, 6]])}" fill="oklch(0.24 0.05 40)"/>
      <path d="${P([[19, 26], [83, 19.5], [83, 24.5], [19, 31]])}M${[[29, 44.5], [75, 40], [75, 44.5], [29, 49]].map(p => p.join(' ')).join('L')}Z" fill="oklch(0.2 0.04 40)"/>
      <path d="M21 21h3.4v6h-3.4zM34 19.6h3.4v6h-3.4zM64 16.6h3.4v6h-3.4zM78 15.2h3.4v6h-3.4z" fill="oklch(0.3 0.05 250)"/>
      <rect x="55" y="50" width="11" height="15" rx="3" fill="oklch(0.22 0.03 270)"/>
      <path d="M-8 44.6V56" stroke="oklch(0.9 0.02 90)" stroke-width="0.6"/><path d="M-12 56h6l2 3.4l4.6 1.4v3.4h-12.6z" fill="oklch(0.62 0.2 25)"/>`, { zoom: 0.82 }],
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
  // Belgium follows the Wires recipe: one dark shape from straight below,
  // a plain sky, thin lines to the corners, one small accent.
  belgian: [
    // Straight up a belfry: a pale clock, bunting to the corners, three pigeons.
    ['Belfry', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.4 0.12 258)'], [0.55, 'oklch(0.72 0.12 40)'], [1, 'oklch(0.92 0.1 86)']])}"/>
      <circle cx="84" cy="94" r="26" fill="oklch(0.96 0.09 90 / 0.35)" filter="${k.blur}"/><circle cx="84" cy="94" r="10" fill="oklch(0.98 0.07 95)"/>
      <g fill="none" stroke="${SIL}" stroke-width="0.8" stroke-linecap="round"><path d="M45 66Q8 76 -70 52M55 64Q98 70 170 44M46 34Q16 16 -34 -70M54 34Q88 10 128 -70"/></g>
      ${[[32, 69.6], [20, 71.4], [8, 71.6], [-4, 70.4], [68, 67.4], [80, 67.6], [92, 66.6], [104, 64.6]].map(([x, y], i) => `<path d="M${x} ${y}l3.6 -0.4l-1.4 5z" fill="${[SIL, 'oklch(0.88 0.16 95)', 'oklch(0.58 0.21 27)'][i % 3]}"/>`).join('')}
      <path d="${P([[27, 170], [73, 170], [57.4, 30], [42.6, 30]])}" fill="${SIL}"/>
      <path d="M40.6 30l2.2 -10l2.2 10zM55 30l2.2 -10l2.2 10z" fill="${SIL}"/>
      <path d="${P([[44.4, 30], [55.6, 30], [54.4, 17], [45.6, 17]])}${P([[44.6, 17], [55.4, 17], [50, -8]])}" fill="${SIL}"/>
      <path d="M50 -8v-6M50 -14l5 1.6l-5 1.6" stroke="${SIL}" stroke-width="0.8" fill="none"/>
      <circle cx="50" cy="52" r="5.6" fill="oklch(0.94 0.06 88)"/><path d="M50 52V48M50 52H53" stroke="${SIL}" stroke-width="1" stroke-linecap="round"/>
      <path d="M45.2 76h3.4v17h-3.4zM51.4 76h3.4v17h-3.4z" fill="oklch(0.62 0.12 40 / 0.55)"/>
      <path d="M72 22q3 -3.4 6 0q3 -3.4 6 0M84 34q2.4 -2.8 4.8 0q2.4 -2.8 4.8 0M16 20q2.4 -2.8 4.8 0q2.4 -2.8 4.8 0" stroke="${SIL}" stroke-width="1" fill="none" stroke-linecap="round"/>`],
    // Up at the steel spheres: tubes to every corner, one glint.
    ['Spheres', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.36 0.13 285)'], [0.55, 'oklch(0.66 0.17 15)'], [1, 'oklch(0.9 0.13 82)']])}"/>
      <circle cx="16" cy="94" r="26" fill="oklch(0.96 0.09 90 / 0.35)" filter="${k.blur}"/><circle cx="16" cy="94" r="10" fill="oklch(0.98 0.07 95)"/>
      <g stroke="${SIL}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M52 56L14 16" stroke-width="5"/><path d="M52 56L90 12" stroke-width="4.4"/><path d="M52 56L98 74" stroke-width="6"/><path d="M52 56L18 108" stroke-width="7"/><path d="M52 56L54 6" stroke-width="3.6"/>
        <path d="M14 16L54 6L90 12L98 74M14 16L18 108" stroke-width="1.8"/></g>
      ${[[52, 56, 19], [14, 16, 9], [90, 12, 8], [98, 74, 12], [18, 108, 15], [54, 6, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SIL}"/><path d="M${(x - r * 0.985).toFixed(1)} ${(y + r * 0.174).toFixed(1)}A${r} ${r} 0 0 0 ${(x - r * 0.174).toFixed(1)} ${(y + r * 0.985).toFixed(1)}" fill="none" stroke="oklch(0.95 0.1 85 / 0.85)" stroke-width="0.9" stroke-linecap="round"/>`).join('')}
      <path d="M66 43m0 -8l1.2 6.8l6.8 1.2l-6.8 1.2l-1.2 6.8l-1.2 -6.8l-6.8 -1.2l6.8 -1.2z" fill="oklch(0.99 0.03 95)"/>`],
    // Up at a windmill: four sails cross the whole frame.
    ['Windmill', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.48 0.1 220)'], [0.6, 'oklch(0.8 0.08 160)'], [1, 'oklch(0.95 0.09 96)']])}"/>
      <circle cx="84" cy="96" r="26" fill="oklch(0.98 0.07 95 / 0.4)" filter="${k.blur}"/><circle cx="84" cy="96" r="10" fill="oklch(0.99 0.05 96)"/>
      <path d="${P([[30, 170], [70, 170], [58.6, 46], [41.4, 46]])}${P([[39.6, 46], [60.4, 46], [56, 34], [44, 34]])}" fill="${SIL}"/>
      <rect x="47.8" y="98" width="4.4" height="7" rx="2.2" fill="oklch(0.92 0.15 92)"/>
      ${[24, 114, 204, 294].map(a => `<g transform="rotate(${a} 50 40)" stroke="${SIL}" fill="none"><path d="M50 40V-40" stroke-width="1.8" stroke-linecap="round"/><path d="M50.9 22V-36H61V22Z" stroke-width="0.8"/><path d="M55.9 22V-36${Array.from({ length: 8 }, (_, i) => `M50.9 ${15.5 - i * 6.5}H61`).join('')}" stroke-width="0.6"/></g>`).join('')}
      <circle cx="50" cy="40" r="3" fill="${SIL}"/>
      <path d="M12 26q3 -3.4 6 0q3 -3.4 6 0M22 38q2.4 -2.8 4.8 0q2.4 -2.8 4.8 0" stroke="${SIL}" stroke-width="1" fill="none" stroke-linecap="round"/>`],
    // Up at the motorway lamps at dusk, one after the other.
    ['Lamps', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.3 0.1 275)'], [0.55, 'oklch(0.58 0.16 335)'], [1, 'oklch(0.88 0.14 62)']])}"/>
      <g fill="oklch(1 0 0 / 0.8)"><circle cx="88" cy="10" r="0.8"/><circle cx="60" cy="30" r="0.6"/><circle cx="96" cy="40" r="0.7"/><circle cx="8" cy="30" r="0.6"/></g>
      <path d="${P([[33, 11], [41, 11], [70, 170], [-20, 170]])}" fill="oklch(0.95 0.14 88 / 0.1)"/>
      <circle cx="36" cy="12" r="15" fill="oklch(0.95 0.14 88 / 0.6)" filter="${k.blur}"/><circle cx="22" cy="56" r="8.5" fill="oklch(0.95 0.14 88 / 0.6)" filter="${k.blur}"/><circle cx="9.4" cy="83" r="5" fill="oklch(0.95 0.14 88 / 0.6)" filter="${k.blur}"/>
      <g fill="${SIL}" stroke="${SIL}" stroke-linecap="round" stroke-linejoin="round">
        <path d="${P([[14.6, 170], [18.4, 170], [17.2, 90], [16.2, 90]])}" stroke="none"/><path d="M16.7 90Q16.6 83.4 11 83.2H9" fill="none" stroke-width="1"/><rect x="6" y="82.2" width="6.4" height="2.4" rx="1.2" stroke="none"/>
        <path d="${P([[38.6, 170], [44.4, 170], [41.8, 66], [40.2, 66]])}" stroke="none"/><path d="M41 66Q40.8 55.6 31 55.4H26" fill="none" stroke-width="1.7"/><rect x="18" y="53.8" width="10" height="3.6" rx="1.8" stroke="none"/>
        <path d="${P([[73.6, 170], [82.4, 170], [71.8, 26], [68.6, 26]])}" stroke="none"/><path d="M70.2 26Q69.6 9.4 52 9H44" fill="none" stroke-width="2.8"/><rect x="29" y="6.2" width="16" height="5.6" rx="2.8" stroke="none"/></g>
      <rect x="31" y="10.4" width="12" height="1.8" rx="0.9" fill="oklch(0.99 0.08 95)"/><rect x="19.4" y="56.2" width="7.4" height="1.3" rx="0.6" fill="oklch(0.99 0.08 95)"/><rect x="6.8" y="83.8" width="4.8" height="0.9" rx="0.4" fill="oklch(0.99 0.08 95)"/>
      <path d="M-70 148L170 116" stroke="${SIL}" stroke-width="3.4"/><path d="M-40 144v20M0 139v24M40 134v28M80 128v32M120 123v36" stroke="${SIL}" stroke-width="2"/>`],
    // Stepped gables along the foot of the frame; tram wires and three pigeons.
    ['Gables', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.34 0.12 270)'], [0.55, 'oklch(0.66 0.16 350)'], [1, 'oklch(0.9 0.13 76)']])}"/>
      <path d="M84 16A9 9 0 1 0 92 30A7.4 7.4 0 0 1 84 16Z" fill="oklch(0.97 0.05 95)"/>
      <g fill="none" stroke="${SIL}" stroke-linecap="round"><path d="M-70 34L170 58M-70 42L170 68" stroke-width="0.8"/><path d="M-20 39.2v7.6M10 42.2v7.8M40 45.2v8M70 48.2v8.2M100 51.2v8.4" stroke-width="0.5"/></g>
      <g fill="${SIL}"><path d="M21 41.4q-2.6 -5 2 -5.4q1 -2 2.8 -0.6l2 0.6l-1.8 0.9q0.2 3.6 -3.4 4.7z"/><path d="M33 42.6q-2.6 -5 2 -5.4q1 -2 2.8 -0.6l2 0.6l-1.8 0.9q0.2 3.6 -3.4 4.7z"/><path d="M61 45.4q-2.6 -5 2 -5.4q1 -2 2.8 -0.6l2 0.6l-1.8 0.9q0.2 3.6 -3.4 4.7z"/></g>
      <path d="M-70 170V104h8v-6h6v-6h6v-6h5v6h6v6h6v6h4v-14h6v-7h6v-7h6v-7h6v7h6v7h6v7h4v8h8v-6h6v-6h6v6h6v6h6V86h7v-8h7v-8h7v-8h6v8h7v8h7v8h6v-26h8v-9h8v-9h8v9h8v9h8V170Z" fill="${SIL}"/>
      <path d="M-14 76h3v10h-3zM60 84h3v10h-3zM108 52h3v10h-3z" fill="${SIL}"/>
      <rect x="-4" y="104" width="6" height="9" fill="oklch(0.92 0.15 92)"/><rect x="100" y="94" width="6" height="9" fill="oklch(0.86 0.16 70)"/>`],
    // A cone of frites held up to the sky; a gull has seen it.
    ['Frites', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.44 0.12 252)'], [0.6, 'oklch(0.76 0.12 38)'], [1, 'oklch(0.93 0.1 88)']])}"/>
      <circle cx="16" cy="94" r="26" fill="oklch(0.96 0.09 90 / 0.35)" filter="${k.blur}"/><circle cx="16" cy="94" r="10" fill="oklch(0.98 0.07 95)"/>
      <g fill="${SIL}">${[[-30, 26], [-17, 32], [-5, 36], [7, 34], [19, 30], [31, 24]].map(([a, l], i) => `<rect x="${36.6 + i * 4.6}" y="${60 - l}" width="5" height="${l + 4}" rx="1" transform="rotate(${a} ${39 + i * 4.6} 60)"/>`).join('')}
        <path d="${P([[34, 58], [68, 58], [57, 112], [45, 112]])}"/><rect x="40" y="100" width="22" height="19" rx="7"/><path d="${P([[42, 170], [64, 170], [59, 112], [44, 112]])}"/></g>
      <path d="M52 50C49 43 56 38 60 42C63 36 72 40 70 46C75 47 74 55 69 55H56C51 55 50 52 52 50Z" fill="oklch(0.98 0.02 95)"/>
      <path d="M64 44L76 20" stroke="${SIL}" stroke-width="0.8"/><path d="M76 20l3 1.4l-2.6 5.2l-3 -1.4z" fill="${SIL}"/><path d="M79 21.4l3 1.4l-2.6 5.2l-3 -1.4z" fill="oklch(0.88 0.16 95)"/><path d="M82 22.8l3 1.4l-2.6 5.2l-3 -1.4z" fill="oklch(0.58 0.21 27)"/>
      <path d="M-4 24Q8 10 22 22Q32 12 46 20Q34 18 26 28Q22 34 16 28Q8 20 -4 24Z" fill="${SIL}"/>
      <path d="M84 60q2.4 -2.8 4.8 0q2.4 -2.8 4.8 0" stroke="${SIL}" stroke-width="1" fill="none" stroke-linecap="round"/>`],
    // Up a flagpole: the three colours fly in the middle of the frame. No birds.
    // The sky is turquoise, so Belgium does not share East Van's dusk.
    ['Flag', -1, k => {
      const X0 = 27.5, wave = x => 3.4 * Math.sin((x - X0) / 6.4) + (x - X0) * 0.1;
      // One strip of cloth between x0 and x1; both edges follow the wave.
      const strip = (x0, x1, c) => {
        const top = [], bot = [];
        for (let x = x0; x <= x1 + 0.01; x += 1.5) { top.push([x.toFixed(1), (30 + wave(x)).toFixed(1)]); bot.unshift([x.toFixed(1), (64 + wave(x) * 1.2).toFixed(1)]); }
        return `<path d="${P([...top, ...bot])}" fill="${c}"/>`;
      };
      return `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.38 0.1 218)'], [0.6, 'oklch(0.72 0.11 196)'], [1, 'oklch(0.95 0.07 172)']])}"/>
      <circle cx="84" cy="96" r="26" fill="oklch(0.99 0.05 170 / 0.45)" filter="${k.blur}"/><circle cx="84" cy="96" r="10" fill="oklch(0.99 0.03 170)"/>
      <g fill="none" stroke="${SIL}" stroke-width="0.8" stroke-linecap="round"><path d="M-70 96L170 110M-70 104L170 120"/></g>
      ${strip(27.5, 42.5, 'oklch(0.2 0.02 280)')}${strip(42.5, 57.5, 'oklch(0.9 0.17 96)')}${strip(57.5, 72.5, 'oklch(0.58 0.22 27)')}
      ${strip(32, 35, 'oklch(1 0 0 / 0.1)')}${strip(39.5, 42.5, 'oklch(0 0 0 / 0.2)')}${strip(51.5, 56, 'oklch(0 0 0 / 0.16)')}${strip(60.5, 63.5, 'oklch(1 0 0 / 0.16)')}${strip(69.5, 72.5, 'oklch(0 0 0 / 0.18)')}
      <path d="${P([[21.6, 170], [30.4, 170], [27.6, 22], [25.6, 22]])}" fill="${SIL}"/>
      <path d="M27.8 34Q33 90 29 136" fill="none" stroke="${SIL}" stroke-width="0.6"/><path d="M28 134h3.4v2.2h-3.4z" fill="${SIL}"/>
      <circle cx="26.6" cy="20" r="2.6" fill="oklch(0.9 0.14 92)"/>`;
    }, { zoom: 0.82 }],
  ],
  // The theme series and the proposed ones. Each subject is whole and sits in
  // the middle of the frame, in its own colours, on a sky in the series hue.
  science: [
    // An atom: three orbits, a warm nucleus, three bright electrons.
    ['Atom', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.3 0.12 264)'], [0.6, 'oklch(0.58 0.14 240)'], [1, 'oklch(0.86 0.08 205)']])}"/>
      <circle cx="50" cy="50" r="20" fill="oklch(0.95 0.08 220 / 0.3)" filter="${k.blur}"/>
      <g fill="none" stroke="oklch(0.97 0.03 220)" stroke-width="1.8">${[0, 60, -60].map(a => `<ellipse cx="50" cy="50" rx="28" ry="10" transform="rotate(${a} 50 50)"/>`).join('')}</g>
      <circle cx="47" cy="48" r="5.6" fill="oklch(0.78 0.17 55)"/><circle cx="53.4" cy="48.6" r="5.6" fill="oklch(0.66 0.21 28)"/><circle cx="50" cy="53.8" r="5.6" fill="oklch(0.82 0.16 70)"/>
      <path d="M43.6 46a4 4 0 0 1 3 -2.8M47 52a4 4 0 0 1 2.6 -2.6" stroke="oklch(1 0 0 / 0.7)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      ${[[76.3, 53.4], [39.8, 25.5], [50.5, 66.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="oklch(0.95 0.15 95 / 0.5)" filter="${k.blur}"/><circle cx="${x}" cy="${y}" r="2.7" fill="oklch(0.95 0.15 95)"/>`).join('')}`],
  ],
  dark: [
    // A fat crescent moon, three stars, one cloud.
    ['Moon', -1, k => {
      const star = (x, y, r) => `<path d="M${x} ${y - r}l${r * 0.24} ${r * 0.76}l${r * 0.76} ${r * 0.24}l${-r * 0.76} ${r * 0.24}l${-r * 0.24} ${r * 0.76}l${-r * 0.24} ${-r * 0.76}l${-r * 0.76} ${-r * 0.24}l${r * 0.76} ${-r * 0.24}z" fill="oklch(0.99 0.04 95)"/>`;
      return `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.2 0.09 285)'], [0.6, 'oklch(0.36 0.14 300)'], [1, 'oklch(0.56 0.16 325)']])}"/>
      <circle cx="46" cy="48" r="28" fill="oklch(0.95 0.1 95 / 0.28)" filter="${k.blur}"/>
      <path d="M52 25A23 23 0 1 0 71 61A18.4 18.4 0 0 1 52 25Z" fill="oklch(0.95 0.1 95)"/>
      <circle cx="40" cy="52" r="3" fill="oklch(0.86 0.1 85)"/><circle cx="48" cy="62" r="2" fill="oklch(0.86 0.1 85)"/><circle cx="36" cy="42" r="1.6" fill="oklch(0.86 0.1 85)"/>
      ${star(71, 32, 5.4)}${star(30, 72, 3.4)}${star(76, 68, 2.6)}
      <g fill="oklch(1 0 0 / 0.8)"><circle cx="24" cy="30" r="0.8"/><circle cx="62" cy="20" r="0.7"/><circle cx="82" cy="50" r="0.7"/></g>
      <path d="M40 78C36 78 34.6 74 37.4 72C37 68 42 66 44.6 68.6C46.6 65 53 65.6 54 69.6C58 69 60.6 72.4 58.6 75.4C59.6 77 58.6 78 57 78Z" fill="oklch(0.32 0.1 296)"/>`;
    }],
  ],
  goo: [
    // A blob of goo with two eyes; it drips.
    ['Blob', 1, k => {
      const G = 'oklch(0.9 0.21 128)', D = 'oklch(0.72 0.2 135)';
      const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="oklch(0.99 0 0)"/><circle cx="${x + 1.6}" cy="${y + 1.4}" r="3.2" fill="oklch(0.14 0.02 150)"/>`;
      return `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.26 0.09 165)'], [0.6, 'oklch(0.44 0.13 155)'], [1, 'oklch(0.66 0.16 142)']])}"/>
      <path d="M31 60h8v15a4 4 0 0 1 -8 0zM48 60h10v21a5 5 0 0 1 -10 0zM64 60h7v10a3.5 3.5 0 0 1 -7 0z" fill="${D}"/>
      <path d="M26 64C21 64 19.6 57.4 23 54C22 42 30 33 42 31.6C46 23 58 21.6 64 29.6C74 29.6 80.6 39.6 77.6 49.6C82.6 54 80.6 64 74 64Z" fill="${G}"/>
      <path d="M30 44C32 38 37 35 43 35" stroke="oklch(1 0 0 / 0.75)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      ${eye(43, 48)}${eye(58, 46)}
      <path d="M46 58q5 4 10 -0.6" stroke="oklch(0.3 0.1 150)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="78" cy="28" r="3" fill="none" stroke="${G}" stroke-width="1.1"/><circle cx="24" cy="30" r="2" fill="none" stroke="${G}" stroke-width="1"/>`;
    }],
  ],
  maths: [
    // A compass draws a circle: the needle at the centre, the lead on the line.
    ['Compass', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.3 0.12 335)'], [0.6, 'oklch(0.56 0.17 350)'], [1, 'oklch(0.82 0.11 20)']])}"/>
      <circle cx="46" cy="58" r="22" fill="oklch(1 0 0 / 0.08)" stroke="oklch(0.99 0.02 90)" stroke-width="1.7"/>
      <path d="M46 58H68" stroke="oklch(0.99 0.02 90 / 0.8)" stroke-width="1" stroke-dasharray="2.4 2.4"/>
      <path d="${P([[53.6, 22], [56.4, 22.6], [47, 58], [45.4, 57.6]])}" fill="oklch(0.9 0.03 250)"/>
      <path d="${P([[54.6, 22.6], [57.6, 21.6], [69.8, 54], [67, 55.4]])}" fill="oklch(0.78 0.04 250)"/>
      <path d="M67 55.4L69.8 54L69 59.4Z" fill="oklch(0.93 0.15 95)"/>
      <rect x="54.2" y="10" width="3.2" height="10" rx="1.6" fill="oklch(0.93 0.15 95)"/><circle cx="55.8" cy="21.6" r="4.2" fill="oklch(0.93 0.15 95)"/><circle cx="55.8" cy="21.6" r="1.5" fill="oklch(0.4 0.12 340)"/>
      <circle cx="46" cy="58" r="1.8" fill="oklch(0.93 0.15 95)"/>`],
  ],
  vistas: [
    // A film still: black bars above and below, a low sun over the water, one long flare.
    ['Vista', 1, k => `<rect ${FIELD} fill="oklch(0.1 0.01 275)"/>
      <rect x="-70" y="30" width="240" height="40" fill="${k.lin([[0, 'oklch(0.36 0.12 285)'], [0.5, 'oklch(0.66 0.17 20)'], [0.62, 'oklch(0.9 0.13 78)'], [0.63, 'oklch(0.5 0.12 300)'], [1, 'oklch(0.24 0.08 285)']])}"/>
      <path d="M-70 55L10 52L24 44L34 50L46 40L58 50L70 46L84 53L170 55Z" fill="oklch(0.28 0.08 295)"/>
      <circle cx="56" cy="52" r="14" fill="oklch(0.98 0.08 90 / 0.45)" filter="${k.blur}"/><path d="M48 55A8 8 0 0 1 64 55Z" fill="oklch(0.99 0.05 95)"/>
      <path d="M50 58h12M52 61h8M49 64.4h14M53 67.6h6" stroke="oklch(0.97 0.09 88 / 0.8)" stroke-width="1" stroke-linecap="round"/>
      <path d="M-70 52H170" stroke="oklch(0.86 0.1 235 / 0.9)" stroke-width="0.7"/><path d="M26 52H86" stroke="oklch(0.95 0.06 230)" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="40" cy="45" r="2.6" fill="oklch(0.9 0.1 200 / 0.4)"/><circle cx="32" cy="41" r="1.4" fill="oklch(0.95 0.1 60 / 0.5)"/>
      <path d="M24 39q2 -2.4 4 0q2 -2.4 4 0M68 36q1.6 -2 3.2 0q1.6 -2 3.2 0" stroke="oklch(0.14 0.03 285)" stroke-width="0.8" fill="none" stroke-linecap="round"/>`],
  ],
  poke: [
    // One big red button; someone has just let go.
    ['Button', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.34 0.12 18)'], [0.6, 'oklch(0.6 0.17 34)'], [1, 'oklch(0.88 0.11 80)']])}"/>
      <ellipse cx="50" cy="70" rx="28" ry="9.6" fill="oklch(0.2 0.03 285)"/><rect x="22" y="60" width="56" height="10" fill="oklch(0.2 0.03 285)"/><ellipse cx="50" cy="60" rx="28" ry="9.6" fill="oklch(0.34 0.04 285)"/>
      <ellipse cx="50" cy="59" rx="19" ry="6.4" fill="oklch(0.46 0.18 26)"/>
      <path d="M31 59V50C31 36 69 36 69 50V59A19 6.4 0 0 1 31 59Z" fill="oklch(0.64 0.23 28)"/>
      <path d="M36 48C37 43 42 40.4 48 40" stroke="oklch(1 0 0 / 0.7)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g stroke="oklch(0.96 0.14 95)" stroke-width="1.8" stroke-linecap="round">${[-150, -120, -90, -60, -30].map(a => { const c = Math.cos(a * Math.PI / 180), n = Math.sin(a * Math.PI / 180); return `<path d="M${(50 + 24 * c).toFixed(1)} ${(46 + 24 * n).toFixed(1)}L${(50 + 31 * c).toFixed(1)} ${(46 + 31 * n).toFixed(1)}"/>`; }).join('')}</g>`],
  ],
  light: [
    // A glass prism: one white ray in, six colours out.
    ['Prism', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.22 0.07 250)'], [0.6, 'oklch(0.4 0.1 228)'], [1, 'oklch(0.66 0.1 202)']])}"/>
      <path d="M12 60L42 48" stroke="oklch(1 0 0)" stroke-width="2" stroke-linecap="round"/>
      <g stroke-width="2" stroke-linecap="round">${[['oklch(0.68 0.23 28)', 37], ['oklch(0.8 0.17 60)', 42.6], ['oklch(0.92 0.17 98)', 48.2], ['oklch(0.8 0.18 148)', 53.8], ['oklch(0.68 0.15 245)', 59.4], ['oklch(0.62 0.2 300)', 65]].map(([c, y]) => `<path d="M59 47L90 ${y}" stroke="${c}"/>`).join('')}</g>
      <path d="M50 27L71 65H29Z" fill="oklch(0.92 0.05 205 / 0.34)" stroke="oklch(0.98 0.02 205)" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M42 48L59 47" stroke="oklch(1 0 0 / 0.5)" stroke-width="1.2"/>
      <path d="M46 40L38 55" stroke="oklch(1 0 0 / 0.8)" stroke-width="1.6" stroke-linecap="round"/>`],
  ],
  wild: [
    // A dandelion clock; three seeds leave.
    ['Dandelion', 1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.34 0.1 205)'], [0.6, 'oklch(0.56 0.12 168)'], [1, 'oklch(0.8 0.14 128)']])}"/>
      <path d="M50 48Q45 68 49 88" fill="none" stroke="oklch(0.86 0.15 135)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M48 82L34 76L38 82L30 84L40 87Z M50 84L64 77L61 83L70 84L60 88Z" fill="oklch(0.74 0.16 140)"/>
      <circle cx="50" cy="44" r="19" fill="oklch(1 0 0 / 0.1)"/>
      <g stroke="oklch(0.99 0.02 100)" stroke-width="0.9" stroke-linecap="round">${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12 + 0.1, c = Math.cos(a), n = Math.sin(a); return `<path d="M${(50 + 4 * c).toFixed(1)} ${(44 + 4 * n).toFixed(1)}L${(50 + 17 * c).toFixed(1)} ${(44 + 17 * n).toFixed(1)}"/>`; }).join('')}</g>
      <g fill="oklch(0.99 0.02 100)">${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12 + 0.1; return `<circle cx="${(50 + 18.4 * Math.cos(a)).toFixed(1)}" cy="${(44 + 18.4 * Math.sin(a)).toFixed(1)}" r="1.5"/>`; }).join('')}</g>
      <circle cx="50" cy="44" r="3.4" fill="oklch(0.84 0.14 90)"/>
      <g stroke="oklch(0.99 0.02 100)" stroke-width="0.9" stroke-linecap="round" fill="none">${[[72, 24], [79, 36], [66, 14]].map(([x, y]) => `<path d="M${x} ${y}l-3 5M${x - 2.6} ${y - 1.2}l2.6 1.2l1.8 -2.4"/>`).join('')}</g>`],
  ],
  odd: [
    // A pale saucer, five lights, and one sock in the beam.
    ['Saucer', -1, k => `<rect ${FIELD} fill="${k.lin([[0, 'oklch(0.24 0.1 300)'], [0.6, 'oklch(0.48 0.18 326)'], [1, 'oklch(0.8 0.14 350)']])}"/>
      <g fill="oklch(1 0 0 / 0.85)"><circle cx="22" cy="26" r="0.8"/><circle cx="78" cy="22" r="0.7"/><circle cx="82" cy="46" r="0.6"/><circle cx="18" cy="52" r="0.6"/></g>
      <path d="${P([[41, 48], [59, 48], [72, 86], [28, 86]])}" fill="oklch(0.96 0.14 100 / 0.32)"/>
      <ellipse cx="50" cy="35" rx="11" ry="9.4" fill="oklch(0.86 0.1 205)"/><path d="M43 33a7 6 0 0 1 5 -5" stroke="oklch(1 0 0 / 0.8)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="44" rx="27" ry="9" fill="oklch(0.86 0.05 325)"/><ellipse cx="50" cy="47" rx="19" ry="4.6" fill="oklch(0.62 0.11 322)"/>
      ${[-20, -10, 0, 10, 20].map((x, i) => `<circle cx="${50 + x}" cy="${(49.4 - Math.abs(x) * 0.12).toFixed(1)}" r="1.9" fill="${i % 2 ? 'oklch(0.9 0.12 200)' : 'oklch(0.96 0.14 95)'}"/>`).join('')}
      <g transform="rotate(-14 50 70)"><path d="M46 60h8v12l5.6 3.2a3.6 3.6 0 0 1 -3.4 6.2H46Z" fill="oklch(0.96 0.015 90)"/><path d="M46 63.4h8M46 66.6h8" stroke="oklch(0.62 0.21 27)" stroke-width="1.4"/></g>`],
  ],
};


export const TILTS = { Slight: 7, Dutch: 15, Wild: 26 };
// The Hex frames crop the shot to a hexagon; Ring and Askew keep the outline apart.
export const FRAMES = ['Thin', 'Hex', 'Hex flat', 'Hex ring', 'Hex askew', 'Circle', 'Print', 'Viewfinder', 'Bare'];
export const LINES = ['Light', 'Series'];

const HEX = [[50, 2], [91.57, 26], [91.57, 74], [50, 98], [8.43, 74], [8.43, 26]];
const grow = (pts, k) => pts.map(([x, y]) => [50 + (x - 50) * k, 50 + (y - 50) * k]);
const turn = (pts, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), n = Math.sin(a); return pts.map(([x, y]) => [50 + (x - 50) * c - (y - 50) * n, 50 + (x - 50) * n + (y - 50) * c]); };
// A polygon path with every corner rounded by r.
const soft = (pts, r) => pts.map((q, i) => {
  const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
  const la = Math.hypot(a[0] - q[0], a[1] - q[1]), lb = Math.hypot(b[0] - q[0], b[1] - q[1]);
  const A = [q[0] + (a[0] - q[0]) / la * r, q[1] + (a[1] - q[1]) / la * r], B = [q[0] + (b[0] - q[0]) / lb * r, q[1] + (b[1] - q[1]) / lb * r];
  return `${i ? 'L' : 'M'}${A[0].toFixed(2)} ${A[1].toFixed(2)}Q${q[0].toFixed(2)} ${q[1].toFixed(2)} ${B[0].toFixed(2)} ${B[1].toFixed(2)}`;
}).join('') + 'Z';
const SQUARE = 'M12 3H88A9 9 0 0 1 97 12V88A9 9 0 0 1 88 97H12A9 9 0 0 1 3 88V12A9 9 0 0 1 12 3Z';
const CIRCLE = 'M3 50a47 47 0 1 0 94 0a47 47 0 1 0 -94 0Z';
// A frame is [the crop, the outline]; no outline draws no line.
const frameOf = name => {
  if (name === 'Hex') { const h = soft(HEX, 5); return [h, h]; }
  if (name === 'Hex flat') { const h = soft(HEX.map(([x, y]) => [y, x]), 5); return [h, h]; }
  if (name === 'Hex ring') return [soft(grow(HEX, 0.8), 4), soft(HEX, 5)];
  if (name === 'Hex askew') return [soft(grow(HEX, 0.9), 4.5), soft(turn(grow(HEX, 0.97), -10), 5)];
  if (name === 'Circle') return [CIRCLE, CIRCLE];
  if (name === 'Print') return ['M12 9H88A3 3 0 0 1 91 12V88A3 3 0 0 1 88 91H12A3 3 0 0 1 9 88V12A3 3 0 0 1 12 9Z', null];
  return [SQUARE, name === 'Thin' ? SQUARE : null];
};

// One icon: key, motif and the knobs { tilt, frame, line }; `c` is the series colour.
export function shotIcon(key, label, opt) {
  const list = SHOTS[key];
  if (!list) return '';
  const [, dir, draw, extra = {}] = list.find(([l]) => l === label) || list[0];
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
  // A shot may ask for a zoom: under 1 shows more of the scene.
  const body = draw(k), ang = dir * (TILTS[opt.tilt] ?? 15), zoom = extra.zoom ? ` translate(50 50) scale(${extra.zoom}) translate(-50 -50)` : '';
  const print = opt.frame === 'Print', view = opt.frame === 'Viewfinder';
  const [crop, outline] = frameOf(opt.frame);
  const ink = opt.line === 'Series' && opt.c ? opt.c : 'oklch(0.95 0.01 90)';
  const line = outline ? `<path d="${outline}" style="fill:none;stroke:${ink};stroke-width:1.1;stroke-linejoin:round"/>` : '';
  const marks = view ? `<g fill="none" stroke="oklch(1 0 0 / 0.85)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20V10H20M80 10H90V20M90 80V90H80M20 90H10V80"/><path d="M44 50H56M50 44V56" stroke-width="0.8"/></g><circle cx="84" cy="16" r="2" fill="oklch(0.65 0.24 25)"/>` : '';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}c"><path d="${crop}"/></clipPath>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" style="stop-color:oklch(0 0 0 / 0)"/><stop offset="1" style="stop-color:oklch(0 0 0 / 0.5)"/></radialGradient>${'DEFS'}</defs>
    ${print ? `<rect x="2" y="2" width="96" height="96" rx="5" style="fill:oklch(0.96 0.012 90)"/>` : ''}
    <g clip-path="url(#${id}c)"><g transform="rotate(${ang} 50 50)${zoom}">${body}</g><rect x="0" y="0" width="100" height="100" fill="url(#${id}v)"/></g>${line}${marks}</svg>`.replace('DEFS', defs.join(''));
}

// Tom's picks live in the browser.
export const SHOT_KEY = 'stimming.serieslab.shots';
export function shotPicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(SHOT_KEY)) || {}; } catch (e) {}
  return {
    // A save from before the Hex ring pick takes the new defaults.
    tilt: TILTS[p.tilt] ? p.tilt : 'Dutch', frame: p.v === 3 && FRAMES.includes(p.frame) ? p.frame : 'Hex ring', line: p.v === 3 && LINES.includes(p.line) ? p.line : 'Series',
    ...Object.fromEntries(Object.keys(SHOTS).map(key => [key, SHOTS[key].some(([l]) => l === p[key]) ? p[key] : SHOTS[key][0][0]])),
  };
}
export function saveShotPicks(p) {
  try { localStorage.setItem(SHOT_KEY, JSON.stringify({ ...p, v: 3 })); } catch (e) {}
}
