// Isometric block icons: each subject is a model built from blocks.
// The view is 30 degree isometric: x runs down-right, y down-left, z up.
// Every solid has a light top, a mid left face and a dark right face.
// A model lists its solids from back to front, bottom to top.
const C30 = Math.cos(Math.PI / 6), U = 10;
const mix = (c, pct, to) => `color-mix(in oklch, ${c} ${pct}%, ${to})`;
const TOP = c => mix(c, 82, 'white'), LEFT = c => mix(c, 80, 'black'), RIGHT = c => mix(c, 52, 'black');
let uid = 0;

function scene() {
  const out = [], pts = [];
  const pt = (x, y, z) => { const p = [(x - y) * C30 * U, (x + y) * 0.5 * U - z * U]; pts.push(p); return p; };
  const d = ps => 'M' + ps.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L');
  // A hair of stroke in the face colour closes the seams.
  const face = (ps, fill) => out.push(`<path d="${d(ps)}Z" style="fill:${fill};stroke:${fill};stroke-width:0.35;stroke-linejoin:round"/>`);
  const rim = ps => out.push(`<path d="${d(ps)}" style="fill:none;stroke:oklch(1 0 0 / 0.5);stroke-width:0.7;stroke-linecap:round;stroke-linejoin:round"/>`);
  const s = {
    // A box: corner x, y, z; size w (along x), d (along y), h (up).
    box(x, y, z, w, dd, h, c) {
      const A = pt(x, y, z + h), B = pt(x + w, y, z + h), C = pt(x + w, y + dd, z + h), D = pt(x, y + dd, z + h);
      const E = pt(x + w, y, z), F = pt(x + w, y + dd, z), G = pt(x, y + dd, z);
      face([D, C, F, G], LEFT(c)); face([B, C, F, E], RIGHT(c)); face([A, B, C, D], TOP(c)); rim([D, C, B]);
      return s;
    },
    // A gable roof; the ridge runs along x.
    gable(x, y, z, w, dd, h, c) {
      const m = y + dd / 2, R0 = pt(x, m, z + h), R1 = pt(x + w, m, z + h);
      face([pt(x, y, z), pt(x + w, y, z), R1, R0], TOP(c));
      face([pt(x, y + dd, z), pt(x + w, y + dd, z), R1, R0], LEFT(c));
      face([pt(x + w, y, z), pt(x + w, y + dd, z), R1], RIGHT(c));
      rim([R0, R1]);
      return s;
    },
    // A pyramid on a w by d base.
    pyr(x, y, z, w, dd, h, c) {
      const X = pt(x + w / 2, y + dd / 2, z + h), F = pt(x + w, y + dd, z);
      face([pt(x, y + dd, z), F, X], LEFT(c)); face([pt(x + w, y, z), F, X], RIGHT(c)); rim([X, F]);
      return s;
    },
    // A flat patch on a left face (the plane y = yp), a right face (x = xp) or a top (z = zp).
    fl(x, yp, z, w, h, c) { face([pt(x, yp, z), pt(x + w, yp, z), pt(x + w, yp, z + h), pt(x, yp, z + h)], c); return s; },
    fr(xp, y, z, dd, h, c) { face([pt(xp, y, z), pt(xp, y + dd, z), pt(xp, y + dd, z + h), pt(xp, y, z + h)], mix(c, 72, 'black')); return s; },
    ft(x, y, zp, w, dd, c) { face([pt(x, y, zp), pt(x + w, y, zp), pt(x + w, y + dd, zp), pt(x, y + dd, zp)], c); return s; },
    // An upright cylinder: centre x, y; base z; radius r; height h.
    cyl(x, y, z, r, h, c) {
      const b = pt(x, y, z), t = pt(x, y, z + h), rx = 1.2247 * r * U, ry = 0.7071 * r * U;
      pts.push([b[0] - rx, b[1] + ry], [b[0] + rx, t[1] - ry]);
      out.push(`<path d="M${t[0] - rx} ${t[1]}V${b[1]}A${rx} ${ry} 0 0 0 ${b[0]} ${b[1] + ry}V${t[1]}Z" style="fill:${LEFT(c)}"/>`,
        `<path d="M${t[0]} ${t[1]}V${b[1] + ry}A${rx} ${ry} 0 0 0 ${b[0] + rx} ${b[1]}V${t[1]}Z" style="fill:${RIGHT(c)}"/>`,
        `<ellipse cx="${t[0]}" cy="${t[1]}" rx="${rx}" ry="${ry}" style="fill:${TOP(c)}"/>`,
        `<path d="M${t[0] - rx} ${t[1]}A${rx} ${ry} 0 0 0 ${t[0] + rx} ${t[1]}" style="fill:none;stroke:oklch(1 0 0 / 0.5);stroke-width:0.7"/>`);
      return s;
    },
    // A ball: centre x, y, z; radius r. The light comes from the top left.
    // `soft` keeps a pale ball pale.
    ball(x, y, z, r, c, soft) {
      const p = pt(x, y, z), id = 'ib' + (uid++), R = r * U;
      pts.push([p[0] - R, p[1] - R], [p[0] + R, p[1] + R]);
      out.push(`<radialGradient id="${id}" cx="0.34" cy="0.3" r="0.8"><stop offset="0" style="stop-color:${TOP(c)}"/><stop offset="0.55" style="stop-color:${soft ? c : LEFT(c)}"/><stop offset="1" style="stop-color:${soft ? mix(c, 70, 'black') : RIGHT(c)}"/></radialGradient><circle cx="${p[0]}" cy="${p[1]}" r="${R}" fill="url(#${id})"/>`);
      return s;
    },
    // A round line through 3D points; a third point makes a sagging wire.
    line(a, b, c, w = 0.8, sag) {
      const A = pt(...a), B = pt(...b);
      const path = sag ? `M${A[0]} ${A[1]}Q${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 + sag * U} ${B[0]} ${B[1]}` : `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`;
      out.push(`<path d="${path}" style="fill:none;stroke:${c};stroke-width:${w};stroke-linecap:round"/>`);
      return s;
    },
    svg() {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const side = Math.max(x1 - x0, y1 - y0) * 1.06, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return `<svg viewBox="${(cx - side / 2).toFixed(2)} ${(cy - side / 2).toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}" aria-hidden="true">${out.join('')}</svg>`;
    },
  };
  return s;
}

// Shared colours.
const WHITE = 'oklch(0.95 0.012 90)', INK = 'oklch(0.22 0.02 275)', LIT = 'oklch(0.88 0.15 92)', WIRE = 'oklch(0.62 0.03 275)';

export const ISO = {
  eastvan: [
    // A block crow: big head, orange beak, one white eye.
    ['Crow', s => {
      const V = 'oklch(0.5 0.15 290)', V2 = 'oklch(0.42 0.14 290)', O = 'oklch(0.8 0.15 62)';
      s.box(4.1, 1.4, 3.3, 2, 1.8, 0.9, V2)
        .box(4.1, 4.4, 0, 0.5, 0.5, 1.7, O).box(5.7, 4.4, 0, 0.5, 0.5, 1.7, O)
        .box(3.4, 3, 1.7, 3.4, 4, 2.9, V).box(6.8, 3.5, 2.2, 0.45, 2.8, 1.7, V2)
        .box(3.6, 5.6, 4.6, 3, 2.6, 2.7, V)
        .box(4.3, 8.2, 5, 1.6, 2.4, 1, O)
        .fr(6.6, 6.3, 5.8, 1.3, 1.3, 'oklch(1 0 0)').fr(6.6, 7, 6, 0.6, 0.6, 'oklch(0.05 0 0)');
    }],
    // The two-floor box house: brick below, stucco above, a low gable.
    ['House', s => {
      const BRICK = 'oklch(0.62 0.13 38)', STUCCO = 'oklch(0.9 0.04 92)', ROOF = 'oklch(0.52 0.08 290)', DOOR = 'oklch(0.62 0.2 25)';
      s.box(1.5, 2, 0, 7, 6, 2.2, BRICK).fl(2.5, 8, 0, 1.2, 1.7, DOOR).fl(5, 8, 0.7, 2.6, 1, LIT)
        .box(1.5, 2, 2.2, 7, 6, 2.1, STUCCO).fl(2.3, 8, 2.9, 2.2, 1, LIT).fl(5.6, 8, 2.9, 2.2, 1, LIT).fr(8.5, 3.6, 2.9, 2.6, 1, LIT)
        .box(1.5, 8, 2.1, 7, 0.9, 0.3, INK)
        .gable(1.1, 1.6, 4.3, 7.8, 6.8, 1.5, ROOF);
    }],
    // A pole, two arms, a can and three wires.
    ['Pole', s => {
      const WOOD = 'oklch(0.6 0.09 60)', ARM = 'oklch(0.72 0.1 66)', CAN = 'oklch(0.66 0.02 250)', GLASS = 'oklch(0.88 0.06 200)';
      s.line([2.2, 5.15, 9.1], [2.2, -0.6, 8.6], WIRE, 0.7, 0.6).line([7.6, 5.15, 9.1], [7.6, -0.6, 8.6], WIRE, 0.7, 0.6)
        .box(4.7, 4.7, 0, 0.6, 0.6, 9.6, WOOD)
        .box(4.75, 2.4, 6.3, 0.5, 5.4, 0.5, ARM)
        .box(1.5, 4.9, 8, 7, 0.5, 0.5, ARM)
        .box(2, 4.95, 8.5, 0.4, 0.4, 0.55, GLASS).box(3.5, 4.95, 8.5, 0.4, 0.4, 0.55, GLASS).box(6.1, 4.95, 8.5, 0.4, 0.4, 0.55, GLASS).box(7.4, 4.95, 8.5, 0.4, 0.4, 0.55, GLASS)
        .cyl(6.2, 5.9, 4.3, 0.75, 1.8, CAN)
        .line([2.2, 5.15, 9.1], [2.2, 10.8, 8.5], WIRE, 0.7, 0.7).line([7.6, 5.15, 9.1], [7.6, 10.8, 8.5], WIRE, 0.7, 0.7)
        .line([2.2, 8.6, 8.2], [2.2, 8.6, 6.9], WHITE, 0.5).box(1.9, 8.1, 6.2, 0.6, 1.2, 0.7, 'oklch(0.66 0.2 25)');
    }],
    // A port crane over a stack of boxes; one box hangs.
    ['Crane', s => {
      const O = 'oklch(0.7 0.19 35)', BLUE = 'oklch(0.66 0.14 250)', YEL = 'oklch(0.85 0.15 92)', TEAL = 'oklch(0.74 0.12 190)', RED = 'oklch(0.62 0.2 25)';
      s.box(0.8, 4.4, 0, 4.2, 1.7, 1.6, YEL).box(0.6, 6.5, 0, 4.2, 1.7, 1.6, BLUE).box(1, 6.3, 1.6, 4.2, 1.7, 1.6, RED)
        .box(5.6, 1.5, 0, 0.5, 0.5, 6, O).box(8.4, 1.5, 0, 0.5, 0.5, 6, O).box(5.6, 4.6, 0, 0.5, 0.5, 6, O).box(8.4, 4.6, 0, 0.5, 0.5, 6, O)
        .box(5.4, 1.3, 6, 3.7, 4, 0.6, O)
        .box(6.9, 2.7, 6.6, 0.6, 0.6, 2.6, O)
        .line([7.2, 3, 9.2], [7.2, -1.2, 7.3], O, 0.7).line([7.2, 3, 9.2], [7.2, 9.6, 7.3], O, 0.7)
        .box(6.85, -1.5, 6.6, 0.7, 11.4, 0.6, O)
        .box(6.4, 5.7, 5.5, 1.6, 1.2, 1.1, WHITE)
        .line([7.2, 8.7, 6.6], [7.2, 8.7, 3.2], WIRE, 0.6).box(6.2, 8, 2.1, 2, 1.4, 1.1, TEAL);
    }],
    // A block skunk: white stripe from nose to tail tip.
    ['Skunk', s => {
      const K = 'oklch(0.42 0.04 300)', PINK = 'oklch(0.82 0.11 345)';
      s.box(4, 1.2, 1, 2, 1.6, 6.2, K).box(4.6, 1.15, 1.2, 0.8, 1.75, 6.2, WHITE)
        .box(3.6, 3.2, 0, 0.7, 0.7, 1.2, K).box(5.7, 3.2, 0, 0.7, 0.7, 1.2, K).box(3.6, 6.2, 0, 0.7, 0.7, 1.2, K).box(5.7, 6.2, 0, 0.7, 0.7, 1.2, K)
        .box(3.4, 2.8, 1.2, 3.2, 4.4, 2.4, K).box(4.6, 2.8, 3.6, 0.8, 4.4, 0.25, WHITE)
        .box(3.8, 7.2, 1.6, 2.4, 1.9, 1.9, K).box(4.6, 7.2, 3.5, 0.8, 1.9, 0.2, WHITE)
        .box(4.7, 9.1, 1.9, 0.6, 0.4, 0.5, PINK)
        .fr(6.2, 7.9, 2.5, 0.7, 0.7, WHITE).fr(6.2, 8.2, 2.6, 0.35, 0.4, 'oklch(0.05 0 0)');
    }],
    // Two peaks with snow, small houses and trees below.
    ['North Shore', s => {
      const ROCK = 'oklch(0.56 0.07 255)', ROCK2 = 'oklch(0.5 0.07 262)', TREE = 'oklch(0.62 0.13 155)', SNOW = 'oklch(0.97 0.01 240)';
      s.pyr(0.5, 0.5, 0, 5, 5, 7, ROCK).pyr(2.25, 2.25, 4.9, 1.5, 1.5, 2.1, SNOW)
        .pyr(4.2, 1.2, 0, 4.6, 4.6, 5.4, ROCK2).pyr(5.82, 2.82, 3.8, 1.36, 1.36, 1.6, SNOW)
        .pyr(0.8, 6, 0, 1.3, 1.3, 2.4, TREE)
        .box(2.6, 6.8, 0, 1.6, 1.5, 1, WHITE).gable(2.5, 6.7, 1, 1.8, 1.7, 0.7, 'oklch(0.62 0.2 25)')
        .pyr(7.6, 5.6, 0, 1.3, 1.3, 2.6, TREE)
        .box(5.4, 7.4, 0, 1.6, 1.5, 1, LIT).gable(5.3, 7.3, 1, 1.8, 1.7, 0.7, 'oklch(0.52 0.08 290)')
        .pyr(8.2, 7.6, 0, 1.2, 1.2, 2, TREE);
    }],
  ],
  belgian: [
    // A box of frites: every fry is its own stick; a ball of mayonnaise.
    ['Frites', s => {
      const Y = 'oklch(0.87 0.15 95)', Y2 = 'oklch(0.8 0.15 80)', RED = 'oklch(0.62 0.2 28)';
      const fries = [[3.2, 3.2, 3.4], [4.2, 3.3, 2.2], [5.2, 3.2, 3.8], [6.1, 3.3, 2.6], [3.3, 4.3, 2.4], [4.3, 4.2, 4.2], [5.3, 4.3, 3], [6.1, 4.2, 3.6],
        [3.2, 5.3, 3.2], [4.2, 5.2, 2], [5.2, 5.3, 3.4], [6.1, 5.3, 2.2], [3.3, 6.1, 1.8], [4.3, 6.1, 2.8], [5.3, 6.1, 1.6], [6.1, 6.1, 2.4]];
      s.box(3, 3, 0, 4, 4, 3.6, WHITE).fl(3, 7, 1.5, 4, 0.9, RED).fr(7, 3, 1.5, 4, 0.9, RED);
      fries.map((f, i) => [...f, i]).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([x, y, h, i]) => s.box(x, y, 3.6, 0.7, 0.7, h, i % 2 ? Y2 : Y));
      s.ball(5.9, 6.2, 6.5, 1.25, 'oklch(0.98 0.03 100)', true);
    }],
    // Two waffles, stacked askew, with chocolate and butter.
    ['Waffle', s => {
      const W = 'oklch(0.82 0.13 80)', POCKET = 'oklch(0.62 0.13 62)', CHOC = 'oklch(0.42 0.08 45)';
      s.box(1.6, 1.6, 0, 7.4, 7.4, 1.5, W).box(0.8, 1, 1.5, 7.4, 7.4, 1.5, W);
      for (const y of [1.6, 3.95, 6.3]) for (const x of [1.4, 3.75, 6.1]) s.ft(x, y, 3, 1.75, 1.75, POCKET);
      s.ft(3.55, 1, 3, 0.9, 7.4, CHOC).fl(3.55, 8.4, 1.9, 0.9, 1.1, mix(CHOC, 80, 'black'))
        .box(4.3, 3.7, 3, 1.5, 1.5, 0.5, LIT);
    }],
    // The flag as three standing slabs, in steps.
    ['Tricolour', s => {
      s.box(1.4, 2.8, 0, 2.2, 2.6, 7, 'oklch(0.34 0.012 275)').box(3.9, 3.7, 0, 2.2, 2.6, 7, 'oklch(0.88 0.17 95)').box(6.4, 4.6, 0, 2.2, 2.6, 7, 'oklch(0.6 0.21 28)');
    }],
    // A block of beer with a head of foam that runs over.
    ['Beer', s => {
      const AMBER = 'oklch(0.76 0.15 70)', FOAM = 'oklch(0.97 0.02 95)', BUB = 'oklch(0.9 0.1 85)';
      s.box(1.8, 1.8, 0, 6.4, 6.4, 0.3, WHITE)
        .box(3, 3, 0.3, 4, 4, 5.4, AMBER).fl(3.7, 7, 1.6, 0.5, 0.5, BUB).fl(5.6, 7, 3.2, 0.4, 0.4, BUB).fl(4.6, 7, 4.2, 0.35, 0.35, BUB).fr(7, 4.4, 2.2, 0.5, 0.5, BUB).fr(7, 5.6, 3.8, 0.4, 0.4, BUB)
        .box(2.7, 2.7, 5.7, 4.6, 4.6, 1.4, FOAM).fl(3.5, 7.3, 4.1, 1.1, 1.7, mix(FOAM, 82, 'black'))
        .box(3.6, 3.4, 7.1, 1.2, 1.2, 0.6, FOAM).box(5.3, 4.9, 7.1, 1, 1, 0.5, FOAM);
    }],
    // Steel balls on tubes: a cube seen corner-on, round its centre ball.
    ['Spheres', s => {
      const STEEL = 'oklch(0.86 0.03 240)', TUBE = 'oklch(0.6 0.03 250)';
      const cs = [[2, 2, 1], [8, 2, 1], [2, 8, 1], [8, 8, 1], [2, 2, 7], [8, 2, 7], [2, 8, 7], [8, 8, 7]], mid = [5, 5, 4];
      const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5], [4, 6], [5, 7], [6, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      const depth = p => p[0] + p[1] + p[2];
      const items = [
        ...cs.slice(1, 7).map(p => ({ z: depth(p), run: () => s.ball(...p, 1.3, STEEL) })), { z: 99, run: () => s.ball(...mid, 1.8, 'oklch(0.72 0.2 318)') },
        ...edges.map(([a, b]) => ({ z: (depth(cs[a]) + depth(cs[b])) / 2, run: () => s.line(cs[a], cs[b], TUBE, 2) })),
        ...cs.map(p => ({ z: (depth(p) + depth(mid)) / 2, run: () => s.line(p, mid, TUBE, 1.8) })),
      ];
      items.sort((a, b) => a.z - b.z).forEach(i => i.run());
    }],
    // Three narrow houses with stepped gables.
    ['Gables', s => {
      const cols = ['oklch(0.62 0.14 35)', 'oklch(0.84 0.1 85)', 'oklch(0.72 0.09 20)'], hs = [4.2, 5.4, 4.6], WIN = 'oklch(0.36 0.06 255)';
      [0, 1, 2].forEach(i => {
        const x = 1 + 2.7 * i, h = hs[i], c = cols[i];
        s.box(x, 3, 0, 2.5, 4, h, c).box(x + 0.4, 3, h, 1.7, 4, 0.7, c).box(x + 0.8, 3, h + 0.7, 0.9, 4, 0.7, c)
          .fl(x + 0.85, 7, 0, 0.8, 1.4, INK).fl(x + 0.4, 7, 2.1, 0.7, 1, i === 1 ? LIT : WIN).fl(x + 1.4, 7, 2.1, 0.7, 1, WIN);
        if (h > 5) s.fl(x + 0.9, 7, 3.8, 0.7, 1, WIN);
      });
    }],
  ],
};

// One icon: key, motif and the series colour. `base` adds the block under the model.
export function isoIcon(key, label, c, base = true) {
  const list = ISO[key];
  if (!list) return '';
  const s = scene();
  if (base) s.box(0, 0, -1.1, 10, 10, 1.1, c);
  (list.find(([l]) => l === label) || list[0])[1](s);
  return s.svg();
}

// Tom's picks live in the browser.
export const ISO_KEY = 'stimming.serieslab.iso';
export function isoPicks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(ISO_KEY)) || {}; } catch (e) {}
  return { base: p.base !== false, ...Object.fromEntries(Object.keys(ISO).map(k => [k, ISO[k].some(([l]) => l === p[k]) ? p[k] : ISO[k][0][0]])) };
}
export function saveIsoPicks(p) {
  try { localStorage.setItem(ISO_KEY, JSON.stringify(p)); } catch (e) {}
}
