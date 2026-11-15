// Block icons: one bold isometric block for each subject.
// The geometry is the icon sheet's: a 128 box, U = (43.3, 25), V = (-43.3, 25).
// The subject is drawn on the three faces, in 100 x 100 face units.
// On the left face x runs to the front edge; on the right face x runs from it.
// Depth z is a percentage of the block height: 0 is the top, 100 the foot.
const BG = 'oklch(0.16 0.012 275)';
const mix = (c, pct, to) => `color-mix(in oklch, ${c} ${pct}%, ${to})`;
const lite = c => mix(c, 80, 'white'), dark = c => mix(c, 70, 'black');
const f = n => n.toFixed(2);
const path = ps => 'M' + ps.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
let uid = 0;

function block({ w = 1, d = 1, h = 50, dx = 0, dy = 0 } = {}) {
  const U = [43.3 * w, 25 * w], V = [-43.3 * d, 25 * d];
  const O = [64 + (d - w) * 43.3 / 2 + dx, (128 - (25 * (w + d) + h)) / 2 + dy];
  const id = 'bk' + (uid++);
  const p = (u, v, z = 0) => [O[0] + (U[0] * u + V[0] * v) / 100, O[1] + (U[1] * u + V[1] * v) / 100 + h * z / 100];
  const L0 = p(0, 100), R0 = p(100, 100);
  const M = {
    top: `matrix(${U[0] / 100} ${U[1] / 100} ${V[0] / 100} ${V[1] / 100} ${f(O[0])} ${f(O[1])})`,
    left: `matrix(${U[0] / 100} ${U[1] / 100} 0 ${h / 100} ${f(L0[0])} ${f(L0[1])})`,
    right: `matrix(${-V[0] / 100} ${-V[1] / 100} 0 ${h / 100} ${f(R0[0])} ${f(R0[1])})`,
  };
  const on = face => inner => `<g transform="${M[face]}" clip-path="url(#${id}c)">${inner}</g>`;
  const b = {
    p,
    defs: `<clipPath id="${id}c"><rect width="100" height="100"/></clipPath><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0.25" style="stop-color:oklch(0 0 0 / 0)"/><stop offset="1" style="stop-color:oklch(0 0 0 / 0.28)"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:oklch(1 0 0 / 0.2)"/><stop offset="0.6" style="stop-color:oklch(1 0 0 / 0)"/></linearGradient>`,
    top: on('top'), left: on('left'), right: on('right'),
    // The three faces: one colour gives a light top, a mid left and a dark right.
    body(c) {
      const [t, l, r] = Array.isArray(c) ? c : [lite(c), c, dark(c)];
      return `<path d="${path([p(0, 100), p(100, 100), p(100, 100, 100), p(0, 100, 100)])}" style="fill:${l}"/><path d="${path([p(100, 100), p(100, 0), p(100, 0, 100), p(100, 100, 100)])}" style="fill:${r}"/><path d="${path([p(0, 0), p(100, 0), p(100, 100), p(0, 100)])}" style="fill:${t}"/>`;
    },
    // The shared light: the sides darken to the foot; the top has a soft sheen.
    shade: () => b.left(`<rect width="100" height="100" fill="url(#${id}s)"/>`) + b.right(`<rect width="100" height="100" fill="url(#${id}s)"/>`) + b.top(`<rect width="100" height="100" fill="url(#${id}g)"/>`),
    // Seams in the page colour, and a rim of light on the top edges.
    edges: () => `<path d="M${f(L0[0])} ${f(L0[1])}L${f(R0[0])} ${f(R0[1])}L${f(p(100, 0)[0])} ${f(p(100, 0)[1])}M${f(R0[0])} ${f(R0[1])}V${f(R0[1] + h)}" style="fill:none;stroke:${BG};stroke-width:1.6;stroke-linejoin:round"/>` +
      b.top(`<path d="M2.5 97.5H97.5V2.5" style="fill:none;stroke:oklch(1 0 0 / 0.38);stroke-width:2.2"/>`),
    // A small box in block space, for a part that sticks out.
    box(u0, u1, v0, v1, z0, z1, c) {
      const [t, l, r] = Array.isArray(c) ? c : [lite(c), c, dark(c)];
      const A = p(u0, v1, z0), B = p(u1, v1, z0), C = p(u1, v0, z0);
      return `<path d="${path([A, B, p(u1, v1, z1), p(u0, v1, z1)])}" style="fill:${l}"/><path d="${path([B, C, p(u1, v0, z1), p(u1, v1, z1)])}" style="fill:${r}"/><path d="${path([p(u0, v0, z0), C, B, A])}" style="fill:${t}"/>` +
        `<path d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}L${f(C[0])} ${f(C[1])}M${f(B[0])} ${f(B[1])}L${f(p(u1, v1, z1)[0])} ${f(p(u1, v1, z1)[1])}" style="fill:none;stroke:${BG};stroke-width:0.9;stroke-linejoin:round"/>`;
    },
    poly: (pts, fill) => `<path d="${path(pts.map(q => p(...q)))}" style="fill:${fill}"/>`,
  };
  return b;
}
const svg = (...parts) => `<svg viewBox="0 0 128 128" aria-hidden="true"><defs>${parts.filter(x => x.defs).map(x => x.defs).join('')}</defs>${parts.filter(x => typeof x === 'string').join('')}</svg>`;
const R = (x, y, w, h, c, rx = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" style="fill:${c}"/>`;
const C = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${c}"/>`;
const byDepth = list => list.slice().sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

const WHITE = 'oklch(0.95 0.012 90)', INK = 'oklch(0.2 0.02 275)', LIT = 'oklch(0.9 0.15 92)', RED = 'oklch(0.6 0.2 26)', GLASS = 'oklch(0.36 0.07 255)';

export const BLOCKS = {
  eastvan: [
    // The house as one block: stucco over brick, a low gable, lit windows.
    ['House', () => {
      const b = block({ w: 1.08, d: 0.9, h: 44, dy: 7 }), ST = 'oklch(0.9 0.04 92)', BR = 'oklch(0.62 0.13 38)', RF = 'oklch(0.5 0.09 290)';
      return svg(b, b.body([RF, ST, dark(ST)]),
        b.left(R(0, 50, 100, 50, BR) + R(10, 14, 30, 24, LIT) + R(58, 14, 30, 24, LIT) + R(12, 60, 17, 40, RED) + R(46, 64, 42, 22, LIT)),
        b.right(R(0, 50, 100, 50, dark(BR)) + R(28, 14, 44, 24, mix(LIT, 82, 'black')) + R(18, 62, 64, 38, 'oklch(0.72 0.02 90)') + R(18, 73, 64, 2, INK) + R(18, 85, 64, 2, INK)),
        b.shade(), b.edges(),
        b.box(0, 100, 100, 108, 46, 53, 'oklch(0.3 0.03 280)'),
        b.poly([[-6, -6, 0], [106, -6, 0], [106, 50, -44], [-6, 50, -44]], lite(RF)), b.poly([[-6, 106, 0], [106, 106, 0], [106, 50, -44], [-6, 50, -44]], RF), b.poly([[106, -6, 0], [106, 106, 0], [106, 50, -44]], dark(RF)),
        `<path d="M${b.p(-6, 50, -44).map(f).join(' ')}L${b.p(106, 50, -44).map(f).join(' ')}" style="fill:none;stroke:oklch(1 0 0 / 0.45);stroke-width:1.4;stroke-linecap:round"/>`);
    }],
    // A crow as a block: two eyes, a beak that sticks out, two feet.
    ['Crow', () => {
      const b = block({ w: 0.9, d: 0.9, h: 46, dy: 0 }), V = 'oklch(0.4 0.12 290)', O = 'oklch(0.8 0.15 62)';
      const eye = (x, y) => C(x, y, 13, 'oklch(0.99 0 0)') + C(x + 3, y + 3, 7, 'oklch(0.1 0.01 275)') + C(x - 1, y - 2, 2.4, 'white');
      return svg(b, b.box(16, 36, 84, 106, 100, 112, O), b.box(64, 84, 84, 106, 100, 112, O),
        b.body(V), b.left(eye(24, 28) + eye(76, 28)), b.right(`<rect x="22" y="34" width="62" height="52" rx="26" style="fill:${dark(dark(V))}"/>`),
        b.top(R(38, 0, 10, 60, dark(V)) + R(54, 0, 10, 44, dark(V))), b.shade(), b.edges(),
        b.box(32, 68, 100, 140, 40, 62, O));
    }],
    // Two shipping boxes, stacked askew.
    ['Containers', () => {
      const one = (c, dx, dy) => {
        const b = block({ w: 1.42, d: 0.6, h: 26, dx, dy });
        const ribs = Array.from({ length: 15 }, (_, i) => R(4 + i * 6.3, 8, 2.4, 84, 'oklch(0 0 0 / 0.22)')).join('');
        return [b, b.body(c) + b.left(ribs + R(0, 0, 100, 7, 'oklch(1 0 0 / 0.14)') + R(0, 93, 100, 7, 'oklch(0 0 0 / 0.2)')) +
          b.right(R(49, 6, 2.4, 88, 'oklch(0 0 0 / 0.45)') + R(22, 6, 3, 88, 'oklch(1 0 0 / 0.3)') + R(74, 6, 3, 88, 'oklch(1 0 0 / 0.3)') + R(14, 48, 20, 5, 'oklch(1 0 0 / 0.45)') + R(66, 48, 20, 5, 'oklch(1 0 0 / 0.45)')) +
          b.top(Array.from({ length: 11 }, (_, i) => R(4 + i * 8.6, 0, 2, 100, 'oklch(0 0 0 / 0.12)')).join('')) + b.shade() + b.edges()];
      };
      const [b1, s1] = one('oklch(0.7 0.12 190)', -2, 17), [b2, s2] = one('oklch(0.68 0.19 35)', 5, -12);
      return svg(b1, b2, s1, s2);
    }],
    // A block of weather: cloud on top, rain down the sides.
    ['Rain', () => {
      const b = block({ w: 0.92, d: 0.92, h: 50 }), NIGHT = 'oklch(0.4 0.08 258)', CLOUD = 'oklch(0.93 0.012 250)', DROP = 'oklch(0.8 0.1 225)';
      const lip = c => `<path d="M0 -2H100V14Q92 28 82 16Q72 6 62 18Q50 34 38 18Q28 8 18 16Q8 26 0 12Z" style="fill:${c}"/>`;
      const rain = seed => Array.from({ length: 9 }, (_, i) => R(6 + i * 10.6, 30 + ((i * seed) % 5) * 11, 3.4, 12 + ((i * 3 + seed) % 3) * 5, DROP, 1.7)).join('');
      return svg(b, b.body([CLOUD, NIGHT, dark(NIGHT)]), b.left(rain(3) + lip(mix(CLOUD, 90, 'black'))), b.right(rain(4) + lip(mix(CLOUD, 76, 'black'))),
        b.top(C(30, 34, 15, 'oklch(1 0 0 / 0.55)') + C(62, 58, 19, 'oklch(1 0 0 / 0.5)') + C(40, 74, 10, 'oklch(1 0 0 / 0.45)')), b.shade(), b.edges());
    }],
    // A trolley bus as one long block, poles up to the wires.
    ['Trolley bus', () => {
      const b = block({ w: 1.5, d: 0.58, h: 32, dy: 9 }), BODY = 'oklch(0.94 0.02 95)', BAND = 'oklch(0.68 0.13 205)', WIRE = 'oklch(0.66 0.03 275)';
      const line = (a, c, w) => `<path d="M${b.p(...a).map(f).join(' ')}L${b.p(...c).map(f).join(' ')}" style="fill:none;stroke:${WIRE};stroke-width:${w};stroke-linecap:round"/>`;
      return svg(b, line([-12, 34, -78], [112, 34, -78], 0.9), line([-12, 66, -78], [112, 66, -78], 0.9),
        b.body(BODY),
        b.left([0, 1, 2, 3, 4].map(i => R(5 + i * 15.6, 14, 12.6, 30, GLASS, 2)).join('') + R(0, 54, 100, 16, BAND) + R(84, 12, 11, 76, 'oklch(0.3 0.05 255)', 2) + C(20, 100, 12, INK) + C(68, 100, 12, INK) + C(20, 100, 5, 'oklch(0.6 0.02 275)') + C(68, 100, 5, 'oklch(0.6 0.02 275)')),
        b.right(R(8, 14, 84, 34, 'oklch(0.62 0.09 235)', 3) + R(22, 3, 56, 8, mix(LIT, 80, 'black')) + R(0, 54, 100, 16, dark(BAND)) + R(10, 76, 16, 9, LIT, 2) + R(74, 76, 16, 9, LIT, 2)),
        b.top(R(10, 20, 70, 60, 'oklch(0 0 0 / 0.08)', 6)), b.shade(), b.edges(),
        line([30, 36, 0], [4, 34, -78], 1.4), line([30, 64, 0], [4, 66, -78], 1.4));
    }],
    // The North Shore on a slab: two peaks with snow, the water in front.
    ['Peaks', () => {
      const b = block({ h: 14, dy: 22 }), LAND = 'oklch(0.72 0.11 160)', ROCK = 'oklch(0.56 0.07 258)', SNOW = 'oklch(0.97 0.01 240)';
      const peak = (u0, v0, s, hgt, c) => {
        const u1 = u0 + s, v1 = v0 + s, X = [u0 + s / 2, v0 + s / 2, -hgt], k = 0.34;
        const cap = q => [X[0] + (q[0] - X[0]) * k, X[1] + (q[1] - X[1]) * k, -hgt * (1 - k)];
        return b.poly([[u0, v1, 0], [u1, v1, 0], X], c) + b.poly([[u1, v0, 0], [u1, v1, 0], X], dark(c)) +
          b.poly([cap([u0, v1]), cap([u1, v1]), X], SNOW) + b.poly([cap([u1, v0]), cap([u1, v1]), X], mix(SNOW, 78, 'black'));
      };
      return svg(b, b.body(LAND), b.top(R(0, 80, 100, 20, 'oklch(0.72 0.11 228)') + R(80, 0, 20, 100, 'oklch(0.72 0.11 228)')), b.shade(), b.edges(),
        peak(4, 4, 52, 430, ROCK), peak(34, 22, 44, 320, mix(ROCK, 88, 'black')),
        b.box(10, 22, 60, 72, -50, 0, WHITE), b.box(60, 72, 8, 20, -44, 0, LIT));
    }],
  ],
  belgian: [
    // The flag as one cube: black, yellow and red faces.
    ['Tricolour', () => {
      const b = block();
      return svg(b, b.body(['oklch(0.88 0.17 95)', 'oklch(0.32 0.014 275)', 'oklch(0.56 0.21 27)']), b.shade(), b.left(R(7, 8, 5, 62, 'oklch(1 0 0 / 0.1)', 2.5)), b.edges());
    }],
    // A waffle slab; chocolate runs over one corner.
    ['Waffle', () => {
      const b = block({ h: 24 }), W = 'oklch(0.83 0.13 80)', PK = 'oklch(0.7 0.13 68)', PS = 'oklch(0.55 0.12 56)', CH = 'oklch(0.4 0.08 45)';
      const pockets = [9, 39, 69].flatMap(y => [9, 39, 69].map(x => R(x, y, 22, 22, PK, 3) + `<path d="M${x} ${y + 3}a3 3 0 0 1 3 -3h19v6h-16v16h-6z" style="fill:${PS}"/>`)).join('');
      const drips = (xs, c) => R(xs[0][0] - 4, -4, 104, 16, c) + xs.map(([x, w, l]) => R(x, 0, w, l, c, w / 2)).join('');
      return svg(b, b.body(W), b.top(pockets + `<path d="M34 100C36 80 54 78 62 64C70 50 94 58 100 38V100Z" style="fill:${CH}"/><path d="M52 88C58 78 70 76 76 68" style="fill:none;stroke:oklch(1 0 0 / 0.25);stroke-width:3;stroke-linecap:round"/>`),
        b.left(R(0, 44, 100, 9, 'oklch(0 0 0 / 0.16)') + `<g transform="translate(38 0)">${drips([[8, 11, 62], [28, 12, 96], [48, 10, 46]], CH)}</g>`),
        b.right(R(0, 44, 100, 9, 'oklch(0 0 0 / 0.2)') + `<g transform="translate(-42 0)">${drips([[46, 11, 80], [66, 12, 42], [86, 9, 60]], dark(CH))}</g>`), b.shade(), b.edges());
    }],
    // A striped box of frites; the mayonnaise runs down the front.
    ['Frites', () => {
      const b = block({ w: 0.84, d: 0.84, h: 42, dy: 15 }), Y = 'oklch(0.88 0.15 95)', Y2 = 'oklch(0.8 0.15 80)', M = 'oklch(0.98 0.03 100)';
      const stripes = c => [0, 25, 50, 75].map(x => R(x, 0, 12.5, 100, c)).join('');
      const fries = byDepth([[10, 10, 105], [40, 8, 78], [70, 12, 125], [12, 40, 84], [42, 42, 140], [70, 40, 92], [12, 70, 66], [40, 72, 108], [70, 70, 76]]);
      const m = b.p(74, 76, -104);
      return svg(b, b.body(['oklch(0.34 0.05 60)', WHITE, dark(WHITE)]), b.left(stripes(RED)), b.right(stripes(dark(RED))), b.shade(), b.edges(),
        fries.map(([u, v, len], i) => b.box(u, u + 18, v, v + 18, -len, 0, i % 2 ? Y2 : Y)).join(''),
        `<ellipse cx="${f(m[0])}" cy="${f(m[1])}" rx="15" ry="11" style="fill:${M}"/><ellipse cx="${f(m[0] - 4)}" cy="${f(m[1] - 4)}" rx="5" ry="2.6" style="fill:white"/>`,
        b.left(R(70, -6, 12, 52, M, 6) + R(84, -6, 9, 30, M, 4.5)));
    }],
    // A cube of beer; the foam runs over.
    ['Beer', () => {
      const b = block({ w: 0.9, d: 0.9, h: 54 }), A = 'oklch(0.76 0.15 70)', FOAM = 'oklch(0.98 0.02 95)';
      const lip = c => `<path d="M0 -2H100V16Q90 30 80 17Q70 8 60 19Q50 36 40 19Q30 7 20 16Q10 27 0 13Z" style="fill:${c}"/>`;
      const bub = [[20, 52, 3], [34, 76, 2.4], [52, 60, 3.4], [70, 82, 2.6], [84, 54, 2.2], [44, 90, 2], [64, 44, 2]].map(([x, y, r]) => C(x, y, r, 'oklch(1 0.08 90 / 0.5)')).join('');
      return svg(b, b.body([FOAM, A, dark(A)]), b.left(bub + lip(mix(FOAM, 92, 'black')) + R(62, 6, 9, 52, mix(FOAM, 92, 'black'), 4.5)), b.right(bub + lip(mix(FOAM, 78, 'black')) + R(24, 6, 8, 40, mix(FOAM, 78, 'black'), 4)),
        b.top(C(28, 30, 9, 'oklch(0 0 0 / 0.05)') + C(60, 44, 13, 'oklch(0 0 0 / 0.05)') + C(38, 70, 8, 'oklch(0 0 0 / 0.05)') + C(76, 76, 6, 'oklch(0 0 0 / 0.05)')), b.shade(), b.edges());
    }],
    // A chocolate bar, half in its wrapper, one corner bitten off.
    ['Chocolate', () => {
      const b = block({ w: 1.2, d: 0.82, h: 16 }), CH = 'oklch(0.42 0.08 45)', GOLD = 'oklch(0.84 0.14 90)';
      const seg = [46, 64, 82].flatMap(x => [5, 37, 69].map(y => R(x, y, 15, 26, mix(CH, 86, 'white'), 2) + `<path d="M${x} ${y}h15v3h-12v23h-3z" style="fill:oklch(1 0 0 / 0.2)"/>`)).join('');
      const bite = b.p(100, 100, 40);
      return svg(b, b.body(CH), b.top(seg), b.shade(), b.edges(),
        b.box(40, 46, -2, 102, -22, 100, GOLD), b.box(-4, 40, -4, 104, -40, 100, RED), b.poly([[10, -4, -40], [20, -4, -40], [20, 104, -40], [10, 104, -40]], GOLD),
        C(f(bite[0]), f(bite[1]), 12, BG) + C(f(bite[0] - 13), f(bite[1] - 3), 7, BG) + C(f(bite[0] + 12), f(bite[1] - 4), 7, BG));
    }],
    // The fry shack as one block: a lit hatch, an awning, a sign on the roof.
    ['Frietkot', () => {
      const b = block({ w: 1.1, d: 0.86, h: 42, dy: 9 }), ROOF = 'oklch(0.72 0.02 250)', Y = 'oklch(0.88 0.16 95)';
      return svg(b, b.body([ROOF, WHITE, dark(WHITE)]),
        b.left(R(0, 64, 100, 36, RED) + R(12, 16, 60, 36, LIT, 2) + `<path d="M30 52l4 -18h12l4 18z" style="fill:oklch(0.6 0.12 60)"/>` + R(80, 26, 13, 74, INK, 2)),
        b.right(R(0, 64, 100, 36, dark(RED)) + R(30, 18, 40, 22, GLASS, 2)), b.shade(), b.edges(),
        b.box(10, 74, 100, 107, 52, 58, 'oklch(0.75 0.02 250)'),
        b.poly([[8, 100, 8], [76, 100, 8], [76, 122, 24], [8, 122, 24]], RED), b.poly([[25, 100, 8], [42, 100, 8], [42, 122, 24], [25, 122, 24]], WHITE), b.poly([[59, 100, 8], [76, 100, 8], [76, 122, 24], [59, 122, 24]], WHITE),
        b.box(14, 84, 66, 74, -44, 0, Y), b.poly([[20, 74, -36], [78, 74, -36], [78, 74, -10], [20, 74, -10]], RED));
    }],
  ],
};

// One icon: key and motif.
export function blockIcon(key, label) {
  const list = BLOCKS[key];
  if (!list) return '';
  return (list.find(([l]) => l === label) || list[0])[1]();
}

// Tom's picks live in the browser.
export const BLOCK_KEY = 'stimming.serieslab.blocks';
export function blockPicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(BLOCK_KEY)) || {}; } catch (e) {}
  return Object.fromEntries(Object.keys(BLOCKS).map(k => [k, BLOCKS[k].some(([l]) => l === p[k]) ? p[k] : BLOCKS[k][0][0]]));
}
export function saveBlockPicks(p) {
  try { localStorage.setItem(BLOCK_KEY, JSON.stringify(p)); } catch (e) {}
}
