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
    // A ramp: full height at the back, none at the front. `axis` names the way down.
    ramp(x, y, z, w, dd, h, c, axis) {
      if (axis === 'x') {
        face([pt(x, y, z + h), pt(x, y + dd, z + h), pt(x + w, y + dd, z), pt(x + w, y, z)], mix(c, 70, 'black'));
        face([pt(x, y + dd, z), pt(x + w, y + dd, z), pt(x, y + dd, z + h)], LEFT(c));
        rim([pt(x, y, z + h), pt(x, y + dd, z + h)]);
      } else {
        face([pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + dd, z), pt(x, y + dd, z)], c);
        face([pt(x + w, y, z), pt(x + w, y + dd, z), pt(x + w, y, z + h)], RIGHT(c));
        rim([pt(x, y, z + h), pt(x + w, y, z + h)]);
      }
      return s;
    },
    // A free polygon through 3D points, for light and glass.
    poly(points, fill) { out.push(`<path d="${d(points.map(p => pt(...p)))}Z" style="fill:${fill}"/>`); return s; },
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

// Sorts [x, y, ...] rows from back to front.
const byDepth = list => list.slice().sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

ISO.eastvan.push(
  // A yard of shipping boxes, stacked a little askew.
  ['Containers', s => {
    const cont = (x, y, z, c) => {
      s.box(x, y, z, 5.6, 2.2, 2.2, c);
      for (let i = 0.7; i < 5.4; i += 0.8) s.fl(x + i, y + 2.2, z + 0.25, 0.14, 1.7, mix(c, 55, 'black'));
      s.fr(x + 5.6, y + 1.03, z + 0.2, 0.14, 1.8, INK);
    };
    cont(1, 0.8, 0, 'oklch(0.72 0.12 190)'); cont(1.3, 0.9, 2.2, 'oklch(0.62 0.2 25)'); cont(0.9, 0.8, 4.4, 'oklch(0.86 0.15 92)');
    cont(2, 3.4, 0, 'oklch(0.62 0.15 255)'); cont(2.4, 3.5, 2.2, 'oklch(0.74 0.17 55)');
    cont(1.2, 6, 0, 'oklch(0.68 0.2 330)');
    s.box(7.6, 6.1, 0, 2.2, 3.4, 2.2, 'oklch(0.7 0.16 150)').fl(8.6, 9.5, 0.2, 0.14, 1.8, INK);
  }],
  // A train on its raised track.
  ['Train', s => {
    const CON = 'oklch(0.78 0.015 90)', CAR = 'oklch(0.95 0.01 240)', BLUE = 'oklch(0.6 0.16 255)', GLASS = 'oklch(0.36 0.06 255)';
    s.box(2, 4.4, 0, 1, 1.2, 3.6, CON).box(7, 4.4, 0, 1, 1.2, 3.6, CON)
      .box(1.6, 3.7, 3.6, 1.8, 2.6, 0.5, CON).box(6.6, 3.7, 3.6, 1.8, 2.6, 0.5, CON)
      .box(-0.6, 3.8, 4.1, 11.2, 2.4, 0.6, CON)
      .box(1.2, 4.1, 4.7, 7, 1.8, 1.9, CAR).fl(1.2, 5.9, 5, 7, 0.35, BLUE);
    for (let i = 0; i < 4; i++) s.fl(1.7 + i * 1.65, 5.9, 5.55, 1.2, 0.75, GLASS);
    s.fr(8.2, 4.35, 5.5, 1.3, 0.8, 'oklch(0.62 0.08 240)').fr(8.2, 4.3, 4.9, 0.35, 0.3, 'oklch(1 0.1 95)').fr(8.2, 5.35, 4.9, 0.35, 0.3, 'oklch(1 0.1 95)');
  }],
  // A trolley bus, poles up to the wires.
  ['Trolley bus', s => {
    const BODY = 'oklch(0.94 0.02 95)', BAND = 'oklch(0.66 0.13 215)', GLASS = 'oklch(0.36 0.06 255)';
    s.box(2.4, 5.4, 0, 1.2, 0.7, 0.9, INK).box(6.6, 5.4, 0, 1.2, 0.7, 0.9, INK)
      .box(1.5, 3.6, 0.6, 7, 2.4, 2.7, BODY).fl(1.5, 6, 0.9, 7, 0.55, BAND).fr(8.5, 3.6, 0.9, 2.4, 0.55, BAND);
    for (let i = 0; i < 4; i++) s.fl(1.9 + i * 1.35, 6, 1.9, 1.05, 0.95, GLASS);
    s.fl(7.35, 6, 0.75, 0.85, 2.1, 'oklch(0.3 0.04 255)')
      .fr(8.5, 3.85, 1.85, 1.9, 1, 'oklch(0.66 0.08 240)').fr(8.5, 4.1, 2.95, 1.4, 0.25, 'oklch(1 0.12 95)')
      .line([3, 4.3, 3.3], [0.4, 4.3, 5.4], WIRE, 0.7).line([3, 5.3, 3.3], [0.4, 5.3, 5.4], WIRE, 0.7)
      .line([-1, 4.3, 5.4], [11, 4.3, 5.4], WIRE, 0.6).line([-1, 5.3, 5.4], [11, 5.3, 5.4], WIRE, 0.6);
  }],
  // The corner store: two awnings, a lit sign, crates of fruit.
  ['Corner store', s => {
    const WALL = 'oklch(0.9 0.04 95)', TRIM = 'oklch(0.55 0.1 160)', AWN = 'oklch(0.64 0.2 25)', WOOD = 'oklch(0.66 0.09 65)';
    s.box(1.5, 1.5, 0, 6.5, 6.5, 3.6, WALL).box(1.3, 1.3, 3.6, 6.9, 6.9, 0.4, TRIM)
      .box(2.4, 7.2, 4, 4.6, 0.4, 1.3, TRIM).fl(2.7, 7.6, 4.25, 4, 0.8, LIT)
      .fl(2.1, 8, 0.4, 2.7, 1.6, LIT).fl(5.5, 8, 0, 1.3, 2.1, INK).fr(8, 2.2, 0.4, 3.8, 1.6, 'oklch(1 0.13 95)')
      .ramp(1.5, 8, 2.3, 6.5, 1.3, 0.8, AWN, 'y').ramp(8, 1.5, 2.3, 1.3, 6.5, 0.8, AWN, 'x')
      .box(2.2, 8.7, 0, 1.2, 0.9, 0.6, WOOD).ball(2.55, 9.1, 0.85, 0.28, 'oklch(0.78 0.17 60)', true).ball(3.05, 9.15, 0.85, 0.28, 'oklch(0.78 0.17 60)', true)
      .box(3.7, 8.7, 0, 1.2, 0.9, 0.6, WOOD).ball(4.05, 9.1, 0.85, 0.28, 'oklch(0.7 0.2 25)', true).ball(4.55, 9.15, 0.85, 0.28, 'oklch(0.75 0.18 140)', true);
  }],
  // A raccoon looks out of a bin; its tail hangs over the side.
  ['Raccoon', s => {
    const BIN = 'oklch(0.56 0.09 160)', FUR = 'oklch(0.68 0.015 275)', FUR2 = 'oklch(0.86 0.01 275)', DARK = 'oklch(0.25 0.015 275)';
    s.box(3, 3, 0, 3.6, 3.6, 4.2, BIN).fl(3.5, 6.6, 1.2, 2.6, 1.5, mix(BIN, 62, 'black')).box(2.8, 2.8, 4.2, 4, 4, 0.3, mix(BIN, 85, 'black'));
    for (let i = 0; i < 5; i++) s.box(6.9, 3.6, 1.5 + i * 0.55, 0.8, 0.8, 0.55, i % 2 ? FUR : DARK);
    s.box(3.6, 4.1, 4.5, 2.4, 2.2, 1.8, FUR).box(3.6, 4.5, 6.3, 0.7, 0.7, 0.6, FUR).box(5.3, 4.5, 6.3, 0.7, 0.7, 0.6, FUR)
      .fl(3.6, 6.3, 5.3, 2.4, 0.6, DARK).fl(3.95, 6.3, 5.4, 0.5, 0.4, 'oklch(1 0 0)').fl(5.15, 6.3, 5.4, 0.5, 0.4, 'oklch(1 0 0)')
      .fr(6, 4.1, 5.3, 2.2, 0.6, DARK)
      .box(4.3, 6.3, 4.6, 1, 0.7, 0.6, FUR2).fl(4.6, 7, 4.85, 0.4, 0.3, DARK)
      .box(3.3, 6.4, 4.5, 0.6, 0.5, 0.35, FUR).box(5.7, 6.4, 4.5, 0.6, 0.5, 0.35, FUR)
      .cyl(8.2, 7.6, 0, 0.45, 0.8, 'oklch(0.7 0.02 250)');
  }],
  // A block cloud and its rain.
  ['Rain', s => {
    const CLOUD = 'oklch(0.88 0.02 250)', DROP = 'oklch(0.7 0.14 240)';
    s.ft(2.4, 6.4, 0.01, 2.2, 1.4, mix(DROP, 70, 'white')).ft(6, 2.8, 0.01, 1.8, 1.3, mix(DROP, 70, 'white'));
    byDepth([[2.6, 3.4, 3.6], [4, 3, 2.2], [5.6, 3.4, 3.9], [7, 3.2, 2.6], [3.2, 5, 2.8], [4.8, 5.2, 4], [6.4, 5, 1.6], [2.4, 6, 1.2], [5.4, 6, 2.6], [7.2, 5.8, 3.8]])
      .forEach(([x, y, z]) => s.box(x, y, z, 0.3, 0.3, 1.3, DROP));
    s.box(1.2, 3.6, 6.3, 1.4, 2, 1, CLOUD).box(2, 2.6, 6, 6, 4, 1.7, CLOUD).box(7.6, 3.4, 6.3, 1.4, 2.2, 1.1, CLOUD).box(3, 3.2, 7.7, 3.4, 2.8, 1.1, CLOUD);
  }],
  // Grain silos at the port, with a head house.
  ['Silos', s => {
    const CON = 'oklch(0.84 0.02 90)', RUST = 'oklch(0.6 0.12 45)';
    byDepth([[2.4, 3], [4.6, 3], [6.8, 3], [2.4, 5.2], [4.6, 5.2], [6.8, 5.2]]).forEach(([x, y]) => s.cyl(x, y, 0, 1.25, 6.2, CON));
    s.box(1.4, 3.5, 6.2, 6.9, 1.2, 0.8, RUST).box(8.3, 2.4, 0, 1.5, 3.6, 8.2, CON)
      .fl(8.6, 6, 6.9, 0.4, 0.5, LIT).fl(9.2, 6, 6.9, 0.4, 0.5, INK).fl(8.6, 6, 5.6, 0.4, 0.5, INK).fl(9.2, 6, 5.6, 0.4, 0.5, LIT).fr(9.8, 3, 6.9, 0.5, 0.5, 'oklch(1 0.13 95)');
  }],
  // A free couch on the kerb, with a lamp.
  ['Couch', s => {
    const C1 = 'oklch(0.72 0.14 80)', C2 = 'oklch(0.82 0.12 85)', CARD = 'oklch(0.72 0.07 70)';
    [[1.5, 3.1], [8.1, 3.1], [1.5, 5.9], [8.1, 5.9]].forEach(([x, y]) => s.box(x, y, 0, 0.4, 0.4, 0.4, INK));
    s.box(1.4, 3, 0.4, 0.8, 3.4, 1.9, C1).box(2.2, 3, 0.4, 5.6, 0.8, 2.7, C1).box(2.2, 3.8, 0.4, 5.6, 2.6, 1, C1)
      .box(2.35, 3.95, 1.4, 2.6, 2.3, 0.4, C2).box(5.05, 3.95, 1.4, 2.6, 2.3, 0.4, C2)
      .box(7.8, 3, 0.4, 0.8, 3.4, 1.9, C1)
      .box(3.4, 7.9, 0, 2.8, 0.2, 1.5, CARD).fl(3.8, 8.1, 0.85, 2, 0.3, INK).fl(4.1, 8.1, 0.4, 1.4, 0.25, INK)
      .box(9, 6.2, 0, 0.25, 0.25, 3.2, 'oklch(0.6 0.02 275)').cyl(9.12, 6.32, 3.2, 0.7, 1, LIT);
  }],
  // A cherry tree in bloom; petals on the ground.
  ['Blossom', s => {
    const P1 = 'oklch(0.84 0.1 350)', P2 = 'oklch(0.78 0.13 350)', P3 = 'oklch(0.9 0.06 350)', BARK = 'oklch(0.45 0.06 50)';
    [[2, 7.4], [6.8, 7.8], [7.8, 5.9], [3.4, 8.6], [8.4, 7.2], [1.4, 5.6]].forEach(([x, y]) => s.ft(x, y, 0.01, 0.5, 0.5, P1));
    s.box(4.6, 4.6, 0, 0.8, 0.8, 3.4, BARK)
      .box(2.2, 4, 3.8, 1.4, 2, 1.4, P2).box(3, 3, 3.2, 4, 4, 2.6, P1).box(3.7, 3.6, 5.8, 2.6, 2.6, 1.3, P3).box(6.6, 3.6, 3.7, 1.3, 2.2, 1.5, P2).box(3.6, 6.8, 3.5, 2.2, 1, 1.3, P2);
  }],
  // The yellow sulphur piles across the water, with a loader.
  ['Sulphur', s => {
    const Y = 'oklch(0.9 0.17 100)', Y2 = 'oklch(0.86 0.17 95)', STEEL = 'oklch(0.62 0.03 250)', O = 'oklch(0.72 0.18 50)';
    s.ft(0, 8.6, 0.01, 10, 1.4, 'oklch(0.66 0.11 235)')
      .pyr(0.8, 1.2, 0, 5.2, 5.2, 4.4, Y).box(8, 1, 0, 0.45, 0.45, 5, STEEL).line([8.2, 1.2, 5], [3.5, 3.8, 4.7], STEEL, 1.5)
      .pyr(4.4, 3.4, 0, 4.4, 4.4, 3.5, Y2)
      .box(1.8, 7, 0, 1.7, 1, 0.8, O).box(2.8, 7.1, 0.8, 0.7, 0.8, 0.7, 'oklch(0.55 0.07 240)').box(1.2, 7.1, 0.1, 0.6, 0.8, 0.5, Y);
  }],
);

ISO.belgian.push(
  // A chocolate bar, half out of its wrapper, one piece gone.
  ['Chocolate', s => {
    const CH = 'oklch(0.44 0.08 45)', WR = 'oklch(0.6 0.2 25)', GOLD = 'oklch(0.84 0.14 90)';
    s.box(1.5, 2.4, 0, 7.2, 5.2, 0.9, CH).box(1.3, 2.2, 0, 2, 5.6, 1.5, WR).ft(1.6, 3.4, 1.5, 1.4, 3.2, GOLD).box(3.3, 2.3, 0, 0.3, 5.4, 1.2, GOLD);
    byDepth([3.7, 5.4, 7.1].flatMap(x => [2.6, 4.3, 6].map(y => [x, y]))).forEach(([x, y]) => { if (!(x > 7 && y > 5.9)) s.box(x, y, 0.9, 1.5, 1.5, 0.45, CH); });
    s.box(8.9, 7.9, 0, 0.5, 0.5, 0.4, CH).box(7.9, 8.8, 0, 0.35, 0.35, 0.3, CH);
  }],
  // An open box of pralines, no two alike.
  ['Pralines', s => {
    const BOX = 'oklch(0.55 0.17 20)', IN = 'oklch(0.3 0.06 30)', GOLD = 'oklch(0.84 0.14 90)', D = 'oklch(0.42 0.08 45)', M = 'oklch(0.62 0.1 55)', W = 'oklch(0.92 0.04 90)';
    s.box(1.5, 0.7, 0, 7, 0.4, 5, BOX).fl(4.6, 1.1, 0, 0.8, 5, GOLD)
      .box(1.5, 1.5, 0, 7, 7, 0.8, BOX).ft(1.9, 1.9, 0.8, 6.2, 6.2, IN);
    const kinds = [
      (x, y) => s.box(x, y, 0.8, 1.4, 1.4, 0.8, D), (x, y) => s.cyl(x + 0.7, y + 0.7, 0.8, 0.7, 0.7, M), (x, y) => s.ball(x + 0.7, y + 0.7, 1.45, 0.7, W, true),
      (x, y) => s.pyr(x, y, 0.8, 1.4, 1.4, 1.1, M), (x, y) => s.box(x, y, 0.8, 1.4, 1.4, 0.7, W).ft(x + 0.2, y + 0.55, 1.5, 1, 0.3, D), (x, y) => s.cyl(x + 0.7, y + 0.7, 0.8, 0.7, 0.9, D),
      (x, y) => s.ball(x + 0.7, y + 0.7, 1.45, 0.7, D), (x, y) => s.box(x, y, 0.8, 1.4, 1.4, 0.8, M).ball(x + 0.7, y + 0.7, 1.8, 0.25, GOLD, true), (x, y) => s.box(x, y, 0.8, 1.4, 1.4, 0.9, 'oklch(0.72 0.14 350)'),
    ];
    byDepth([2.3, 4.3, 6.3].flatMap((x, i) => [2.3, 4.3, 6.3].map((y, j) => [x, y, i * 3 + j]))).forEach(([x, y, n]) => kinds[n](x, y));
  }],
  // A crate of nine bottles.
  ['Crate', s => {
    const R = 'oklch(0.6 0.2 25)', BR = 'oklch(0.47 0.09 55)', GOLD = 'oklch(0.84 0.14 90)';
    s.box(2, 2, 0, 6, 6, 3.2, R).ft(2.4, 2.4, 3.2, 5.2, 5.2, INK).fl(2, 8, 0.5, 6, 0.9, WHITE).fl(4, 8, 2.1, 2, 0.6, INK).fr(8, 2, 0.5, 6, 0.9, 'oklch(1 0 0)').fr(8, 4, 2.1, 2, 0.6, INK);
    byDepth([3.2, 5, 6.8].flatMap(x => [3.2, 5, 6.8].map(y => [x, y]))).forEach(([x, y]) => s.cyl(x, y, 3.2, 0.62, 1, BR).cyl(x, y, 4.2, 0.28, 1.1, BR).cyl(x, y, 5.3, 0.33, 0.18, GOLD));
  }],
  // A belfry over its hall, with a clock.
  ['Belfry', s => {
    const ST = 'oklch(0.8 0.05 80)', ST2 = 'oklch(0.87 0.05 85)', SL = 'oklch(0.5 0.05 255)', WIN = 'oklch(0.36 0.06 255)';
    s.box(1.5, 3.5, 0, 7, 3.6, 2.6, ST);
    for (let i = 0; i < 5; i++) s.fl(2 + i * 1.3, 7.1, 0.7, 0.7, 1.2, WIN);
    s.fr(8.5, 4.2, 0.7, 0.8, 1.2, WIN).fr(8.5, 5.6, 0.7, 0.8, 1.2, WIN)
      .gable(1.3, 3.3, 2.6, 7.4, 4, 1.4, SL)
      .box(3.9, 4.2, 3.2, 2.2, 2.2, 4.6, ST2).fl(4.6, 6.4, 4.2, 0.8, 1.2, WIN).fl(4.5, 6.4, 6.2, 1, 1, 'oklch(1 0 0)').fl(4.9, 6.4, 6.6, 0.2, 0.5, INK).fr(6.1, 4.8, 6.2, 1, 1, 'oklch(1 0 0)')
      .box(3.7, 4, 7.8, 2.6, 2.6, 0.4, ST).box(4.3, 4.6, 8.2, 1.4, 1.4, 1, ST2).pyr(4.1, 4.4, 9.2, 1.8, 1.8, 2.4, SL);
  }],
  // Cobbles, no two the same height, and a dropped bottle.
  ['Cobbles', s => {
    const G = ['oklch(0.64 0.015 275)', 'oklch(0.72 0.03 80)', 'oklch(0.56 0.02 255)'], hs = [0.6, 0.9, 0.5, 0.8, 0.7];
    byDepth([0, 1, 2, 3, 4].flatMap(i => [0, 1, 2, 3, 4].map(j => [0.35 + i * 1.9, 0.35 + j * 1.9, i, j])))
      .forEach(([x, y, i, j]) => s.box(x, y, 0, 1.7, 1.7, hs[(i * 2 + j * 3) % 5], G[(i + j * 2) % 3]));
    s.cyl(6.9, 6.9, 0.6, 0.45, 1.3, WHITE).cyl(6.9, 6.9, 1.9, 0.25, 0.35, 'oklch(0.62 0.2 25)');
  }],
  // A pot of mussels, the lid beside it.
  ['Mussels', s => {
    const POT = 'oklch(0.52 0.05 262)', SH = 'oklch(0.34 0.07 270)', OR = 'oklch(0.78 0.15 65)';
    s.box(1.9, 4.7, 1.5, 0.6, 0.6, 0.4, POT).cyl(5, 5, 0, 2.6, 2.7, POT);
    byDepth([[4, 4.2, 3], [5.4, 3.9, 3], [6, 5, 3.1], [4.4, 5.6, 3.1], [5.4, 5.6, 3.6], [4.8, 4.6, 3.8]]).forEach(([x, y, z], i) => s.ball(x, y, z, 0.75, i % 3 === 1 ? OR : SH));
    s.box(7.5, 4.7, 1.5, 0.6, 0.6, 0.4, POT)
      .cyl(8, 8.2, 0, 1.5, 0.3, POT).cyl(8, 8.2, 0.3, 0.3, 0.35, POT)
      .ball(2, 8, 0.6, 0.6, 'oklch(0.9 0.16 100)', true);
  }],
  // The fry shack: a hatch, an awning and a cone on the roof.
  ['Frietkot', s => {
    const W = 'oklch(0.95 0.02 95)', R = 'oklch(0.6 0.2 25)', Y = 'oklch(0.88 0.16 95)', ST = 'oklch(0.7 0.02 250)';
    s.box(1.5, 2, 0, 7, 5, 3.4, W).fl(1.5, 7, 0, 7, 1.2, R).fr(8.5, 2, 0, 5, 1.2, R)
      .fl(2.4, 7, 1.5, 4.6, 1.3, LIT).fr(8.5, 4.9, 0, 1.3, 2.5, INK)
      .box(2.2, 7, 1.3, 5, 0.6, 0.2, ST)
      .ramp(2, 7, 2.8, 5.4, 1.4, 0.6, R, 'y')
      .box(1.2, 1.7, 3.4, 7.6, 5.6, 0.35, ST)
      .box(2.2, 6.2, 3.75, 4.4, 0.35, 1.3, Y).fl(2.5, 6.55, 4, 3.8, 0.8, R)
      .box(7.1, 2.6, 3.75, 1.1, 1.1, 1.2, W).fl(7.1, 3.7, 4.2, 1.1, 0.3, R);
    [[7.2, 2.7, 1.3], [7.75, 2.7, 0.9], [7.2, 3.2, 0.8], [7.75, 3.2, 1.5]].forEach(([x, y, h]) => s.box(x, y, 4.95, 0.35, 0.35, h, Y));
  }],
  // The lit motorway: three lamps, one car.
  ['Motorway', s => {
    const ASP = 'oklch(0.32 0.012 275)', ST = 'oklch(0.66 0.02 250)', GLOW = 'oklch(0.9 0.15 95 / 0.22)';
    s.ft(0, 3.4, 0.01, 10, 3.8, ASP).ft(0, 3.6, 0.02, 10, 0.15, WHITE).ft(0, 6.85, 0.02, 10, 0.15, WHITE);
    for (let i = 0; i < 4; i++) s.ft(0.6 + i * 2.5, 5.2, 0.02, 1.3, 0.18, WHITE);
    const lamp = x => s.poly([[x, 4.9, 5], [x, 3.5, 0.03], [x, 6.9, 0.03]], GLOW).box(x - 0.12, 2.5, 0, 0.25, 0.25, 5.2, ST).box(x - 0.12, 2.5, 5.2, 0.25, 2.6, 0.22, ST).box(x - 0.25, 4.5, 4.95, 0.5, 0.8, 0.25, LIT);
    lamp(1.4); lamp(5);
    s.box(5.9, 5.7, 0.1, 2, 1, 0.6, 'oklch(0.62 0.2 25)').box(6.3, 5.8, 0.7, 1.1, 0.8, 0.5, 'oklch(0.6 0.08 240)');
    lamp(8.6);
  }],
  // A stalk of sprouts; two got away.
  ['Sprouts', s => {
    const ST = 'oklch(0.82 0.1 125)', SP = 'oklch(0.72 0.16 135)', LEAF = 'oklch(0.6 0.13 145)';
    [[4.15, 5, 1.4], [5, 4.15, 2.5], [4.15, 5, 3.6], [5, 4.15, 4.7], [4.15, 5, 5.8], [5, 4.15, 6.9]].forEach(([x, y, z]) => s.ball(x, y, z, 0.75, SP));
    s.cyl(5, 5, 0, 0.7, 8, ST);
    [[5.85, 5, 1], [5, 5.85, 1.9], [5.7, 5.7, 2.9], [5.85, 5, 3.9], [5, 5.85, 4.8], [5.7, 5.7, 5.8], [5.85, 5, 6.8], [5, 5.85, 7.4]].forEach(([x, y, z]) => s.ball(x, y, z, 0.78, SP));
    s.box(3.6, 3.6, 8, 2.8, 2.8, 0.45, LEAF).box(4.3, 4.3, 8.45, 1.4, 1.4, 0.9, mix(LEAF, 85, 'white'))
      .ball(7.8, 7.6, 0.7, 0.7, SP).ball(2.4, 7.4, 0.6, 0.6, SP);
  }],
  // The little fountain boy on his block, and his arc.
  ['Fountain', s => {
    const ST = 'oklch(0.8 0.02 90)', ST2 = 'oklch(0.72 0.02 90)', BR = 'oklch(0.68 0.11 65)', WA = 'oklch(0.76 0.11 225)';
    s.box(6.6, 1.8, 0, 2, 2, 3.4, ST2)
      .box(7.05, 2.4, 3.4, 0.45, 0.5, 1.3, BR).box(7.75, 2.4, 3.4, 0.45, 0.5, 1.3, BR)
      .box(6.65, 2.4, 5.3, 0.3, 0.6, 0.9, BR).box(6.95, 2.2, 4.7, 1.35, 1, 1.7, BR).box(8.3, 2.4, 5.3, 0.3, 0.6, 0.9, BR)
      .box(6.9, 2.05, 6.4, 1.45, 1.3, 1.3, BR).fl(7.15, 3.35, 6.95, 0.3, 0.3, INK).fl(7.8, 3.35, 6.95, 0.3, 0.3, INK)
      .box(1.2, 5, 0, 6, 4, 1, ST).ft(1.6, 5.4, 1, 5.2, 3.2, WA)
      .line([7.6, 3.2, 4.9], [3.8, 7.2, 1.05], WA, 1.1, -2.2)
      .ft(3.2, 6.7, 1.01, 1.2, 1, mix(WA, 55, 'white'));
  }],
);

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
